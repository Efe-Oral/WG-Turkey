-- Marketplace events (section 12.1). Never holds message text, emails, phone
-- numbers or IP addresses.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  user_id uuid references public.profiles (id) on delete set null,
  session_id uuid,
  listing_id uuid references public.listings (id) on delete set null,
  conversation_id uuid,
  province_id uuid references public.provinces (id),
  district_id uuid references public.districts (id),
  props jsonb not null default '{}',
  referrer_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text
);

create index events_name_created_idx on public.events (name, created_at desc);
create index events_created_idx on public.events (created_at desc);
create index events_listing_idx on public.events (listing_id, name);
create index events_user_idx on public.events (user_id, created_at desc);

alter table public.events enable row level security;

-- Inserts come only from the server, which uses the service role.
create policy "Admins read events"
  on public.events for select
  to authenticated
  using (public.is_admin());

grant select on public.events to authenticated;

create table public.daily_metrics (
  date date not null,
  metric_key text not null,
  dimension_key text not null default '',
  value double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (date, metric_key, dimension_key)
);

alter table public.daily_metrics enable row level security;

create policy "Admins read daily metrics"
  on public.daily_metrics for select
  to authenticated
  using (public.is_admin());

grant select on public.daily_metrics to authenticated;
