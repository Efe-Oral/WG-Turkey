-- Visitors can no longer read the private listings table, so their policy goes
-- through the public view only. Owners and admins get a second path.
drop policy "Photos of public listings are readable" on public.listing_photos;

create policy "Photos of public listings are readable"
  on public.listing_photos for select
  to anon, authenticated
  using (
    exists (select 1 from public.public_listings v where v.id = listing_id)
  );

create policy "Owners and admins read photos of their listings"
  on public.listing_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
    )
  );
