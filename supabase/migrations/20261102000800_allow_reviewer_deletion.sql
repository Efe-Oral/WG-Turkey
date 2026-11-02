-- Deleting an admin account must not be blocked by listings they reviewed.
alter table public.listings
  drop constraint listings_reviewed_by_fkey,
  add constraint listings_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles (id) on delete set null;
