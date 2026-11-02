-- Gender, birth year and bio are only for people in a conversation together, so
-- the public view keeps just what a listing card needs.
revoke select on public.public_profiles from anon, authenticated;

grant select (
  id, display_name, avatar_url, account_type, phone_verified, member_since
) on public.public_profiles to anon, authenticated;
