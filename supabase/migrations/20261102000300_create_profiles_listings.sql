-- Profiles, listings and photos.
--
-- Access model (section 6.3):
--   * Base tables are private: owners and admins only.
--   * The public reads through public_listings and public_profiles, which list
--     only safe columns. building_no, lat, lng and phone are never exposed.

create type public.account_type as enum ('private', 'business');
create type public.user_role as enum ('user', 'admin');
create type public.gender as enum ('female', 'male', 'unspecified');
create type public.occupation_status as enum ('student', 'employed', 'other');
create type public.display_name_mode as enum ('first_initial', 'full', 'first');

create type public.listing_status as enum (
  'draft', 'pending_review', 'active', 'paused', 'rented', 'deleted'
);
create type public.listing_category as enum ('room', 'studio', 'flat');
create type public.rental_term as enum ('open_ended', 'fixed');
create type public.wanted_gender as enum ('any', 'female', 'male');
create type public.smoking_policy as enum ('allowed', 'balcony', 'not_allowed');
create type public.furnishing as enum ('furnished', 'partial', 'unfurnished');
create type public.rented_via as enum ('yes', 'no', 'elsewhere');
create type public.boost_source as enum ('admin_test', 'paid');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  display_name_mode public.display_name_mode not null default 'first_initial',
  gender public.gender,
  birth_year smallint check (birth_year between 1900 and 2100),
  occupation_status public.occupation_status,
  occupation_field text,
  about text check (char_length(about) <= 2000),
  avatar_url text,
  phone text,
  phone_verified_at timestamptz,
  account_type public.account_type not null default 'private',
  role public.user_role not null default 'user',
  safety_ack_at timestamptz,
  kvkk_consent_at timestamptz,
  kvkk_text_version text,
  email_notifications boolean not null default true,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Used by RLS policies. Security definer, so it can read profiles from inside
-- a policy on profiles without recursing.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "Users read their own profile, admins read all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Privileged columns are never writable by users themselves.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (
  first_name, last_name, display_name_mode, gender, birth_year,
  occupation_status, occupation_field, about, avatar_url,
  safety_ack_at, kvkk_consent_at, kvkk_text_version, email_notifications
) on public.profiles to authenticated;

create function public.display_name(
  p_first text,
  p_last text,
  p_mode public.display_name_mode
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_first is null or p_first = '' then null
    when p_mode = 'full' then trim(p_first || ' ' || coalesce(p_last, ''))
    when p_mode = 'first' then p_first
    when p_last is null or p_last = '' then p_first
    else p_first || ' ' || left(p_last, 1) || '.'
  end;
$$;

create view public.public_profiles as
select
  id,
  public.display_name(first_name, last_name, display_name_mode) as display_name,
  avatar_url,
  account_type,
  phone_verified_at is not null as phone_verified,
  created_at as member_since,
  gender,
  birth_year,
  about
from public.profiles
where banned_at is null;

grant select on public.public_profiles to anon, authenticated;

-- Replaces phone numbers and links with a marker the UI explains to visitors.
create function public.mask_contact_info(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(
        p_text,
        '(\+?90[\s.\-]*)?\(?0?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}',
        '•••',
        'g'
      ),
      '(https?://|www\.)\S+',
      '•••',
      'gi'
    ),
    '\m[a-z0-9\-]+\.(com|net|org|io|me|co|info|tr)(\.tr)?(/\S*)?',
    '•••',
    'gi'
  );
$$;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  public_number bigint generated always as identity (start with 10000001) unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status public.listing_status not null default 'draft',
  category public.listing_category not null default 'room',
  rental_term public.rental_term not null default 'open_ended',

  title text not null default '' check (char_length(title) <= 80),
  slug text not null default '',

  province_id uuid references public.provinces (id),
  district_id uuid references public.districts (id),
  neighborhood text,
  street text,
  building_no text,
  postal_code text,
  lat double precision,
  lng double precision,
  public_lat double precision,
  public_lng double precision,

  available_from date,
  available_to date,

  building_type text,
  floor text,
  room_size_m2 smallint check (room_size_m2 > 0),
  flat_size_m2 smallint check (flat_size_m2 > 0),
  room_layout text,
  transit_walk_min smallint check (transit_walk_min >= 0),
  building_age text,

  rent integer check (rent >= 0),
  dues integer check (dues >= 0),
  utilities_estimate integer check (utilities_estimate >= 0),
  other_costs integer check (other_costs >= 0),
  deposit integer check (deposit >= 0),
  utilities_included boolean not null default false,
  -- Deposit is excluded, utilities count unless the rent already covers them.
  total_monthly integer generated always as (
    coalesce(rent, 0) + coalesce(dues, 0) + coalesce(other_costs, 0)
    + case when utilities_included then 0 else coalesce(utilities_estimate, 0) end
  ) stored,
  -- Rooms compare by room size, studios and flats by flat size.
  size_m2 smallint generated always as (
    coalesce(room_size_m2, flat_size_m2)
  ) stored,

  household_size smallint check (household_size between 2 and 20),
  residents_female smallint check (residents_female >= 0),
  residents_male smallint check (residents_male >= 0),
  residents_age_min smallint,
  residents_age_max smallint,
  wanted_gender public.wanted_gender,
  wanted_age_min smallint,
  wanted_age_max smallint,
  smoking public.smoking_policy,
  has_pets boolean,
  languages text[] not null default '{}',
  household_types text[] not null default '{}',

  desc_room text,
  desc_location text,
  desc_household text,
  desc_other text,
  word_count integer not null default 0,

  furnishing public.furnishing,
  heating text,
  internet_type text,
  internet_speed text,
  bathroom text[] not null default '{}',
  flooring text,
  amenities text[] not null default '{}',

  show_phone boolean not null default false,
  quality_score smallint not null default 0,
  photo_count smallint not null default 0,

  published_at timestamptz,
  last_bumped_at timestamptz,
  paused_at timestamptz,
  rented_at timestamptz,
  rented_via_platform public.rented_via,
  rented_conversation_id uuid,
  deleted_at timestamptz,
  delete_reason text,

  boosted_until timestamptz,
  boost_source public.boost_source,

  moderation_flags text[] not null default '{}',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  reject_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create index listings_search_idx
  on public.listings (status, province_id, category, published_at desc);
create index listings_district_idx on public.listings (status, district_id);
create index listings_total_idx on public.listings (total_monthly);
create index listings_available_from_idx on public.listings (available_from);
create index listings_owner_idx on public.listings (owner_id);
create index listings_amenities_idx on public.listings using gin (amenities);
create index listings_household_types_idx on public.listings using gin (household_types);

-- Sets the public map point once, 80 to 250 metres from the real address. It
-- only moves if the pin moves far, so repeated edits cannot reveal the address
-- by averaging.
create function public.set_public_coordinates()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
declare
  bearing double precision;
  meters double precision;
  moved boolean;
begin
  if new.lat is null or new.lng is null then
    return new;
  end if;

  moved := tg_op = 'UPDATE'
    and old.lat is not null
    and (abs(new.lat - old.lat) > 0.005 or abs(new.lng - old.lng) > 0.005);

  if new.public_lat is null or moved then
    bearing := random() * 2 * pi();
    meters := 80 + random() * 170;
    new.public_lat := new.lat + (meters * cos(bearing)) / 111320;
    new.public_lng := new.lng
      + (meters * sin(bearing)) / (111320 * cos(radians(new.lat)));
  end if;

  return new;
end;
$$;

create trigger listings_set_public_coordinates
  before insert or update of lat, lng on public.listings
  for each row execute function public.set_public_coordinates();

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  sort_order smallint not null default 0,
  phash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger listing_photos_set_updated_at
  before update on public.listing_photos
  for each row execute function public.set_updated_at();

create index listing_photos_listing_idx
  on public.listing_photos (listing_id, sort_order);
create index listing_photos_phash_idx on public.listing_photos (phash);

create function public.refresh_photo_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings
  set photo_count = (
    select count(*) from public.listing_photos where listing_id = target
  )
  where id = target;
  return null;
end;
$$;

create trigger listing_photos_refresh_count
  after insert or delete on public.listing_photos
  for each row execute function public.refresh_photo_count();

-- Only safe columns. Runs with the owner's rights on purpose, so the public can
-- read these columns while the base table stays private.
create view public.public_listings
with (security_barrier = true) as
select
  l.id,
  l.public_number,
  l.owner_id,
  l.status,
  l.category,
  l.rental_term,
  l.title,
  l.slug,
  l.province_id,
  p.name as province_name,
  p.slug as province_slug,
  l.district_id,
  d.name as district_name,
  d.slug as district_slug,
  l.neighborhood,
  l.street,
  l.public_lat,
  l.public_lng,
  l.available_from,
  l.available_to,
  l.building_type,
  l.floor,
  l.room_size_m2,
  l.flat_size_m2,
  l.size_m2,
  l.room_layout,
  l.transit_walk_min,
  l.building_age,
  l.rent,
  l.dues,
  l.utilities_estimate,
  l.other_costs,
  l.deposit,
  l.utilities_included,
  l.total_monthly,
  l.household_size,
  l.residents_female,
  l.residents_male,
  l.residents_age_min,
  l.residents_age_max,
  l.wanted_gender,
  l.wanted_age_min,
  l.wanted_age_max,
  l.smoking,
  l.has_pets,
  l.languages,
  l.household_types,
  public.mask_contact_info(l.desc_room) as desc_room,
  public.mask_contact_info(l.desc_location) as desc_location,
  public.mask_contact_info(l.desc_household) as desc_household,
  public.mask_contact_info(l.desc_other) as desc_other,
  l.furnishing,
  l.heating,
  l.internet_type,
  l.internet_speed,
  l.bathroom,
  l.flooring,
  l.amenities,
  l.show_phone,
  l.photo_count,
  l.published_at,
  l.paused_at,
  l.rented_at,
  l.boosted_until > now() as is_boosted,
  (
    select ph.storage_path from public.listing_photos ph
    where ph.listing_id = l.id
    order by ph.sort_order
    limit 1
  ) as cover_path,
  pr.display_name as owner_name,
  pr.avatar_url as owner_avatar_url,
  pr.account_type as owner_account_type,
  pr.phone_verified as owner_phone_verified,
  pr.member_since as owner_member_since
from public.listings l
join public.provinces p on p.id = l.province_id
join public.districts d on d.id = l.district_id
join public.public_profiles pr on pr.id = l.owner_id
where l.status in ('active', 'paused', 'rented');

grant select on public.public_listings to anon, authenticated;

alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;

create policy "Owners and admins read listings"
  on public.listings for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "Owners create listings"
  on public.listings for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners and admins update listings"
  on public.listings for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

grant select, insert, update on public.listings to authenticated;

create policy "Photos of public listings are readable"
  on public.listing_photos for select
  to anon, authenticated
  using (
    exists (select 1 from public.public_listings v where v.id = listing_id)
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "Owners manage their photos"
  on public.listing_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

grant select on public.listing_photos to anon;
grant select, insert, update, delete on public.listing_photos to authenticated;

-- Unmasked descriptions for logged-in visitors (section 5.3).
create function public.get_listing_descriptions(p_listing_id uuid)
returns table (
  desc_room text,
  desc_location text,
  desc_household text,
  desc_other text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.desc_room, l.desc_location, l.desc_household, l.desc_other
  from public.listings l
  where l.id = p_listing_id
    and l.status in ('active', 'paused', 'rented')
    and auth.uid() is not null;
$$;

revoke execute on function public.get_listing_descriptions(uuid) from public, anon;
grant execute on function public.get_listing_descriptions(uuid) to authenticated;

-- Photos and avatars: public read, owners write inside their own folder.
insert into storage.buckets (id, name, public)
values
  ('listing-photos', 'listing-photos', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
