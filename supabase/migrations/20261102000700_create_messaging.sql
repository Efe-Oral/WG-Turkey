-- Conversations outlive their people: deleting an account sets the id to null
-- and the other side sees "Silinmiş kullanıcı".
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  lister_id uuid references public.profiles (id) on delete set null,
  seeker_id uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_sender_id uuid references public.profiles (id) on delete set null,
  lister_unread integer not null default 0,
  seeker_unread integer not null default 0,
  archived_by_lister boolean not null default false,
  archived_by_seeker boolean not null default false,
  first_reply_at timestamptz,
  last_notified_lister_at timestamptz,
  last_notified_seeker_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, seeker_id)
);

create index conversations_lister_idx
  on public.conversations (lister_id, last_message_at desc);
create index conversations_seeker_idx
  on public.conversations (seeker_id, last_message_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 3000),
  read_at timestamptz,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index message_templates_user_idx on public.message_templates (user_id);

create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

alter table public.reports
  add constraint reports_message_id_fkey
  foreign key (message_id) references public.messages (id) on delete set null;

alter table public.listings
  add constraint listings_rented_conversation_id_fkey
  foreign key (rented_conversation_id)
  references public.conversations (id) on delete set null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_templates enable row level security;

-- Sending goes through server actions, which enforce bans and rate limits.
create policy "Participants read conversations"
  on public.conversations for select
  to authenticated
  using (lister_id = auth.uid() or seeker_id = auth.uid());

create policy "Participants read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.lister_id = auth.uid() or c.seeker_id = auth.uid())
    )
  );

create policy "Users manage their templates"
  on public.message_templates for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;

-- Live unread counts and open threads (section 5.5).
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;

-- Median minutes to first reply, once there is enough data to be fair.
create function public.get_owner_response_minutes(p_owner_id uuid)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) >= 3 then
    percentile_cont(0.5) within group (
      order by extract(epoch from (first_reply_at - created_at)) / 60
    )
  end
  from public.conversations
  where lister_id = p_owner_id and first_reply_at is not null;
$$;

grant execute on function public.get_owner_response_minutes(uuid) to anon, authenticated;
