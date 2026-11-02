-- Listing and photo writes go through server actions only. They validate the
-- input, run the moderation checks and decide the status. Direct API writes
-- would let an owner set status = 'active' or clear moderation flags.
drop policy "Owners create listings" on public.listings;
drop policy "Owners and admins update listings" on public.listings;
drop policy "Owners manage their photos" on public.listing_photos;

revoke insert, update, delete on public.listings from authenticated;
revoke insert, update, delete on public.listing_photos from authenticated;

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_listing_idx on public.favorites (listing_id);

create trigger favorites_set_updated_at
  before update on public.favorites
  for each row execute function public.set_updated_at();

create table public.listing_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  note text not null check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create trigger listing_notes_set_updated_at
  before update on public.listing_notes
  for each row execute function public.set_updated_at();

alter table public.favorites enable row level security;
alter table public.listing_notes enable row level security;

create policy "Users manage their favorites"
  on public.favorites for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their notes"
  on public.listing_notes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.listing_notes to authenticated;
