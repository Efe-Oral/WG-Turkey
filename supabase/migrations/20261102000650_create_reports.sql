create type public.report_reason as enum (
  'scam', 'fake', 'wrong_info', 'discriminatory', 'offensive', 'already_rented', 'other'
);
create type public.report_status as enum ('open', 'dismissed', 'actioned');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete cascade,
  message_id uuid,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_listing_idx on public.reports (listing_id, status);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

create policy "Admins read reports"
  on public.reports for select
  to authenticated
  using (public.is_admin());

grant select on public.reports to authenticated;
