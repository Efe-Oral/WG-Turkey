-- Supabase grants anon and authenticated everything on new objects by default.
-- Row Level Security covers tables, but the public views run with their owner's
-- rights, so a write through one would skip it. This replaces the defaults with
-- exactly what the app needs.
revoke all on all tables in schema public from anon, authenticated;

-- New objects start closed, so a future table cannot be exposed by accident.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

-- Everyone can read public data.
grant select on public.provinces to anon, authenticated;
grant select on public.districts to anon, authenticated;
grant select on public.public_listings to anon, authenticated;
grant select on public.listing_photos to anon, authenticated;
grant select (
  id, display_name, avatar_url, account_type, phone_verified, member_since
) on public.public_profiles to anon, authenticated;

-- Row Level Security narrows these to the user's own rows, or to admins.
grant select on public.profiles to authenticated;
grant update (
  first_name, last_name, display_name_mode, gender, birth_year,
  occupation_status, occupation_field, about, avatar_url,
  safety_ack_at, kvkk_consent_at, kvkk_text_version, email_notifications
) on public.profiles to authenticated;

grant select on public.listings to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant select on public.reports to authenticated;
grant select on public.events to authenticated;
grant select on public.daily_metrics to authenticated;

grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.listing_notes to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
