-- Nightly metrics and listing expiry (sections 8 and 12).

-- Counters per day, overall (dimension '') and per province ('province:<id>').
create function public.compute_daily_metrics(p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_start timestamptz := p_date::timestamp at time zone 'Europe/Istanbul';
  day_end timestamptz := day_start + interval '1 day';
begin
  delete from public.daily_metrics where date = p_date;

  -- One counter per event type.
  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, m.metric, d.dimension, count(*)
  from public.events e
  join (values
    ('searches', 'search'),
    ('zero_searches', 'search_zero_results'),
    ('favorites', 'favorite_add'),
    ('signups', 'signup_completed'),
    ('messages', 'message_sent'),
    ('boost_clicks', 'boost_interest'),
    ('new_listings', 'listing_published'),
    ('rented_total', 'listing_rented'),
    ('rejected', 'listing_rejected'),
    ('approved', 'listing_approved'),
    ('reports', 'report_created'),
    ('listing_views', 'listing_view'),
    ('renewed', 'listing_renewed')
  ) as m(metric, event_name) on m.event_name = e.name
  cross join lateral (
    values ('')
    union all
    select 'province:' || e.province_id where e.province_id is not null
  ) as d(dimension)
  where e.created_at >= day_start and e.created_at < day_end
  group by m.metric, d.dimension;

  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, 'rented_platform', d.dimension, count(*)
  from public.events e
  cross join lateral (
    values ('')
    union all
    select 'province:' || e.province_id where e.province_id is not null
  ) as d(dimension)
  where e.name = 'listing_rented'
    and e.props ->> 'rented_via_platform' = 'yes'
    and e.created_at >= day_start and e.created_at < day_end
  group by d.dimension;

  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, 'sessions', d.dimension, count(distinct e.session_id)
  from public.events e
  cross join lateral (
    values ('')
    union all
    select 'province:' || e.province_id where e.province_id is not null
  ) as d(dimension)
  where e.session_id is not null
    and e.created_at >= day_start and e.created_at < day_end
  group by d.dimension;

  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, 'filter_sessions', '', count(distinct e.session_id)
  from public.events e
  where e.name = 'filter_changed'
    and e.created_at >= day_start and e.created_at < day_end;

  -- Snapshot of the listing stock at the end of the day.
  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, s.metric, d.dimension, s.value
  from (
    select
      l.province_id,
      count(*) as active,
      avg(greatest(
        extract(epoch from (day_end - coalesce(l.published_at, l.created_at))) / 86400,
        0
      )) as age_days,
      count(*) filter (where l.photo_count >= 3) as with_photos
    from public.listings l
    where l.status = 'active'
      and coalesce(l.published_at, l.created_at) < day_end
    group by l.province_id
  ) p
  cross join lateral (
    values
      ('active_listings', p.active::double precision),
      ('listing_age_sum', (p.age_days * p.active)::double precision),
      ('listings_3plus_photos', p.with_photos::double precision)
  ) as s(metric, value)
  cross join lateral (values ('all'), ('province:' || p.province_id)) as d(dimension)
  where p.province_id is not null;

  -- The snapshot above adds provinces into a temporary 'all' row per province,
  -- so they are summed into the overall row here.
  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select p_date, metric_key, '', sum(value)
  from public.daily_metrics
  where date = p_date and dimension_key = 'all'
  group by metric_key;

  delete from public.daily_metrics where date = p_date and dimension_key = 'all';

  insert into public.daily_metrics (date, metric_key, dimension_key, value)
  select
    p_date,
    'median_rent',
    'district:' || l.district_id || ':' || l.category,
    percentile_cont(0.5) within group (order by l.rent)
  from public.listings l
  where l.status = 'active' and l.rent is not null and l.district_id is not null
  group by l.district_id, l.category;
exception
  when unique_violation then
    -- Two provinces can never share a row, so this means a concurrent run.
    raise notice 'compute_daily_metrics skipped a concurrent run for %', p_date;
end;
$$;

-- Section 8: 30 days without an update pauses a listing.
create function public.expire_listings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired integer;
begin
  with updated as (
    update public.listings
    set status = 'paused', paused_at = now()
    where status = 'active'
      and coalesce(last_bumped_at, published_at, created_at) < now() - interval '30 days'
    returning id, owner_id, province_id, district_id
  ), logged as (
    insert into public.events (name, user_id, listing_id, province_id, district_id)
    select 'listing_expired', owner_id, id, province_id, district_id from updated
    returning 1
  )
  select count(*) into expired from logged;

  return expired;
end;
$$;

create function public.run_nightly_jobs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_listings();
  perform public.compute_daily_metrics(
    ((now() at time zone 'Europe/Istanbul')::date - 1)
  );
end;
$$;

-- Everything the dashboard shows as a table or ratio, for one date range.
create function public.metrics_tables(
  p_from date,
  p_to date,
  p_province uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with period as (
    select
      p_from::timestamp at time zone 'Europe/Istanbul' as from_ts,
      (p_to + 1)::timestamp at time zone 'Europe/Istanbul' as to_ts
  ),
  e as (
    select ev.* from public.events ev, period
    where ev.created_at >= period.from_ts and ev.created_at < period.to_ts
      and (p_province is null or ev.province_id = p_province)
  ),
  c as (
    select co.*
    from public.conversations co
    join public.listings li on li.id = co.listing_id, period
    where co.created_at >= period.from_ts and co.created_at < period.to_ts
      and (p_province is null or li.province_id = p_province)
  ),
  per_listing as (
    select count(*) as n from c group by listing_id
  )
  select jsonb_build_object(
    'top_districts', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select d.name as district, count(*) as listings
        from public.listings l
        join public.districts d on d.id = l.district_id
        where l.status = 'active'
          and (p_province is null or l.province_id = p_province)
        group by d.name order by count(*) desc, d.name limit 10
      ) t), '[]'::jsonb),
    'zero_results', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          props ->> 'province' as province,
          coalesce(props ->> 'district', '') as district,
          coalesce(props ->> 'category', '') as category,
          coalesce(props ->> 'max_rent', '') as max_rent,
          count(*) as searches
        from e where name = 'search_zero_results'
        group by 1, 2, 3, 4 order by count(*) desc limit 10
      ) t), '[]'::jsonb),
    'delete_reasons', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select props ->> 'reason' as reason, count(*) as listings
        from e where name = 'listing_deleted'
        group by 1 order by count(*) desc
      ) t), '[]'::jsonb),
    'flags', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select flag, count(*) as listings
        from public.listings l, unnest(l.moderation_flags) as flag, period
        where l.updated_at >= period.from_ts and l.updated_at < period.to_ts
          and (p_province is null or l.province_id = p_province)
        group by flag order by count(*) desc
      ) t), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          coalesce(nullif(utm_source, ''), nullif(referrer_source, ''), 'direkt') as source,
          count(distinct session_id) as sessions
        from e where session_id is not null
        group by 1 order by count(distinct session_id) desc limit 10
      ) t), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'visits', (select count(distinct session_id) from e where session_id is not null),
      'listing_views', (select count(distinct session_id) from e where name = 'listing_view'),
      'messages', (select count(*) from c),
      'replies', (select count(*) from c where first_reply_at is not null),
      'rented', (select count(*) from e where name = 'listing_rented'
                 and props ->> 'rented_via_platform' = 'yes')
    ),
    'messages_per_listing_mean', (select round(avg(n), 2) from per_listing),
    'messages_per_listing_median', (
      select percentile_cont(0.5) within group (order by n) from per_listing),
    'first_reply_minutes_median', (
      select percentile_cont(0.5) within group (
        order by extract(epoch from (first_reply_at - created_at)) / 60)
      from c where first_reply_at is not null),
    'reply_rate_72h', (
      select round(100.0 * count(*) filter (
        where first_reply_at <= created_at + interval '72 hours'
      ) / nullif(count(*), 0), 1) from c),
    'rented_within_14d_rate', (
      select round(100.0 * count(*) filter (
        where l.rented_at <= l.published_at + interval '14 days'
      ) / nullif(count(*), 0), 1)
      from public.listings l, period
      where l.published_at >= period.from_ts and l.published_at < period.to_ts
        and (p_province is null or l.province_id = p_province)),
    'pending_review', (
      select count(*) from public.listings
      where status = 'pending_review'
        and (p_province is null or province_id = p_province)),
    'repeat_lister_rate', (
      select round(100.0 * count(*) filter (where n > 1) / nullif(count(*), 0), 1)
      from (
        select count(*) as n from public.listings
        where published_at is not null
          and (p_province is null or province_id = p_province)
        group by owner_id
      ) t),
    'reports_per_100', (
      select round(100.0 * (select count(*) from e where name = 'report_created')
        / nullif((select count(*) from public.listings
                  where status = 'active'
                    and (p_province is null or province_id = p_province)), 0), 1)),
    'reject_rate', (
      select round(
        100.0 * count(*) filter (where name = 'listing_rejected')
        / nullif(count(*), 0), 1)
      from e where name in ('listing_rejected', 'listing_approved')),
    'retention_7d', (
      select round(100.0 * count(*) filter (where returned_7) / nullif(count(*), 0), 1)
      from (
        select bool_or(ev.created_at >= f.first_at + interval '7 days') as returned_7
        from (
          select user_id, min(created_at) as first_at from public.events
          where user_id is not null group by user_id
        ) f
        join public.events ev on ev.user_id = f.user_id, period
        where f.first_at >= period.from_ts and f.first_at < period.to_ts
        group by f.user_id
      ) t),
    'retention_30d', (
      select round(100.0 * count(*) filter (where returned_30) / nullif(count(*), 0), 1)
      from (
        select bool_or(ev.created_at >= f.first_at + interval '30 days') as returned_30
        from (
          select user_id, min(created_at) as first_at from public.events
          where user_id is not null group by user_id
        ) f
        join public.events ev on ev.user_id = f.user_id, period
        where f.first_at >= period.from_ts and f.first_at < period.to_ts
        group by f.user_id
      ) t),
    'boost_unique_listers', (
      select count(distinct user_id) from e where name = 'boost_interest'),
    'possible_business', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          pr.display_name as user_name,
          pr.id as user_id,
          count(*) as listings
        from public.listings l
        join public.public_profiles pr on pr.id = l.owner_id
        where l.status <> 'deleted' and pr.account_type = 'private'
        group by pr.id, pr.display_name
        having count(*) >= 4
        order by count(*) desc limit 20
      ) t), '[]'::jsonb),
    'supply_demand', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          d.name as district,
          count(distinct l.id) as active_listings,
          (select count(*) from e where e.name = 'search' and e.district_id = d.id) as searches,
          round(
            (select count(*) from e where e.name = 'search' and e.district_id = d.id)::numeric
            / nullif(count(distinct l.id), 0), 1) as searches_per_listing
        from public.listings l
        join public.districts d on d.id = l.district_id
        where l.status = 'active'
          and (p_province is null or l.province_id = p_province)
        group by d.id, d.name
        order by count(distinct l.id) desc limit 15
      ) t), '[]'::jsonb),
    'median_rents', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          d.name as district,
          l.category,
          count(*) as listings,
          percentile_cont(0.5) within group (order by l.rent) as median_rent
        from public.listings l
        join public.districts d on d.id = l.district_id
        where l.status = 'active' and l.rent is not null
          and (p_province is null or l.province_id = p_province)
        group by d.name, l.category
        order by d.name, l.category limit 40
      ) t), '[]'::jsonb)
  );
$$;

revoke execute on function public.compute_daily_metrics(date) from public, anon, authenticated;
revoke execute on function public.expire_listings() from public, anon, authenticated;
revoke execute on function public.run_nightly_jobs() from public, anon, authenticated;
revoke execute on function public.metrics_tables(date, date, uuid) from public, anon, authenticated;

create extension if not exists pg_cron;

-- 00:30 Istanbul time.
select cron.schedule('nightly-jobs', '30 21 * * *', 'select public.run_nightly_jobs()');
