-- Three open reports pause a listing, so they must come from three people.
-- Repeats are dismissed rather than deleted, which keeps the history.
update public.reports as repeat
set status = 'dismissed', handled_at = now()
where repeat.status = 'open'
  and repeat.listing_id is not null
  and repeat.reporter_id is not null
  and exists (
    select 1
    from public.reports as earlier
    where earlier.status = 'open'
      and earlier.listing_id = repeat.listing_id
      and earlier.reporter_id = repeat.reporter_id
      and (earlier.created_at, earlier.id) < (repeat.created_at, repeat.id)
  );

create unique index reports_one_open_per_reporter_idx
  on public.reports (reporter_id, listing_id)
  where status = 'open' and listing_id is not null;
