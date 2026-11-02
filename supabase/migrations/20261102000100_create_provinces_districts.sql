-- Shared trigger function for updated_at, used by every table from here on.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  plate_code smallint not null unique check (plate_code between 1 and 81),
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  province_id uuid not null references public.provinces (id) on delete restrict,
  name text not null,
  slug text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (province_id, slug),
  unique (province_id, name)
);

create trigger provinces_set_updated_at
  before update on public.provinces
  for each row execute function public.set_updated_at();

create trigger districts_set_updated_at
  before update on public.districts
  for each row execute function public.set_updated_at();

-- Public reference data: anyone can read it, nobody can write through the API.
alter table public.provinces enable row level security;
alter table public.districts enable row level security;

create policy "Provinces are publicly readable"
  on public.provinces for select
  to anon, authenticated
  using (true);

create policy "Districts are publicly readable"
  on public.districts for select
  to anon, authenticated
  using (true);

grant select on public.provinces to anon, authenticated;
grant select on public.districts to anon, authenticated;
