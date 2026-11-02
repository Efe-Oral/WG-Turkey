import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const INBOX_PAGE_SIZE = 25;

export type Peer = {
  id: string | null;
  name: string | null;
  avatarUrl: string | null;
  gender: "female" | "male" | "unspecified" | null;
  age: number | null;
  about: string | null;
  memberSince: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name_mode: "first_initial" | "full" | "first";
  gender: Peer["gender"];
  birth_year: number | null;
  about: string | null;
  avatar_url: string | null;
  created_at: string;
};

function displayName(profile: ProfileRow): string | null {
  if (!profile.first_name) return null;
  if (profile.display_name_mode === "first") return profile.first_name;
  if (profile.display_name_mode === "full") {
    return `${profile.first_name} ${profile.last_name ?? ""}`.trim();
  }
  return profile.last_name
    ? `${profile.first_name} ${profile.last_name.charAt(0)}.`
    : profile.first_name;
}

/** Only called for people already in a conversation with the viewer. */
async function getPeers(ids: string[]): Promise<Map<string, Peer>> {
  if (ids.length === 0) return new Map();

  const { data } = await createAdminClient()
    .from("profiles")
    .select(
      "id, first_name, last_name, display_name_mode, gender, birth_year, about, avatar_url, created_at",
    )
    .in("id", ids);

  const year = new Date().getFullYear();

  return new Map(
    ((data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      {
        id: profile.id,
        name: displayName(profile),
        avatarUrl: profile.avatar_url,
        gender: profile.gender,
        age: profile.birth_year ? year - profile.birth_year : null,
        about: profile.about,
        memberSince: profile.created_at,
      },
    ]),
  );
}

const DELETED_PEER: Peer = {
  id: null,
  name: null,
  avatarUrl: null,
  gender: null,
  age: null,
  about: null,
  memberSince: null,
};

export type InboxFilter = "all" | "unread" | "archived";

export type InboxRow = {
  id: string;
  peer: Peer;
  listingTitle: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  lastIsMine: boolean;
  unread: number;
};

export async function getInbox(
  viewer: Viewer,
  filter: InboxFilter,
  page: number,
): Promise<{ rows: InboxRow[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * INBOX_PAGE_SIZE;

  let query = supabase
    .from("conversations")
    .select(
      "id, lister_id, seeker_id, listing_id, last_message_at, last_message_preview, last_sender_id, lister_unread, seeker_unread, archived_by_lister, archived_by_seeker",
      { count: "exact" },
    )
    .or(`lister_id.eq.${viewer.id},seeker_id.eq.${viewer.id}`)
    .order("last_message_at", { ascending: false });

  // Archive flags differ per side, so each side gets its own condition.
  const viewerIs = (side: "lister" | "seeker", archived: boolean) =>
    `and(${side}_id.eq.${viewer.id},archived_by_${side}.is.${archived})`;
  const archived = filter === "archived";
  query = query.or(
    `${viewerIs("lister", archived)},${viewerIs("seeker", archived)}`,
  );

  if (filter === "unread") {
    query = query.or(
      `and(lister_id.eq.${viewer.id},lister_unread.gt.0),and(seeker_id.eq.${viewer.id},seeker_unread.gt.0)`,
    );
  }

  const { data, count } = await query.range(from, from + INBOX_PAGE_SIZE - 1);
  const rows = data ?? [];

  const peerId = (row: (typeof rows)[number]): string | null =>
    row.lister_id === viewer.id ? row.seeker_id : row.lister_id;

  const peers = await getPeers(
    rows.map(peerId).filter((id): id is string => id !== null),
  );

  const listingIds = rows
    .map((row) => row.listing_id)
    .filter((id): id is string => id !== null);

  const { data: listings } = listingIds.length
    ? await createAdminClient()
        .from("listings")
        .select("id, title")
        .in("id", listingIds)
    : { data: [] };

  const titles = new Map((listings ?? []).map((item) => [item.id, item.title]));

  return {
    total: count ?? 0,
    rows: rows.map((row) => {
      const id = peerId(row);
      return {
        id: row.id,
        peer: (id && peers.get(id)) || DELETED_PEER,
        listingTitle: row.listing_id ? (titles.get(row.listing_id) ?? null) : null,
        lastMessagePreview: row.last_message_preview,
        lastMessageAt: row.last_message_at,
        lastIsMine: row.last_sender_id === viewer.id,
        unread: row.lister_id === viewer.id ? row.lister_unread : row.seeker_unread,
      };
    }),
  };
}

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  flagged: boolean;
};

export type Thread = {
  id: string;
  peer: Peer;
  isLister: boolean;
  listing: {
    id: string;
    publicNumber: number;
    title: string;
    slug: string;
    status: string;
    category: string;
    householdSize: number | null;
    sizeM2: number | null;
    total: number;
    rentedConversationId: string | null;
  } | null;
  messages: ThreadMessage[];
};

export async function getThread(
  conversationId: string,
  viewer: Viewer,
): Promise<Thread | null> {
  const supabase = await createClient();

  // Row Level Security returns nothing unless the viewer is a participant.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, lister_id, seeker_id, listing_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, flagged")
    .eq("conversation_id", conversationId)
    .order("created_at");

  const isLister = conversation.lister_id === viewer.id;
  const peerId = isLister ? conversation.seeker_id : conversation.lister_id;
  const peers = await getPeers(peerId ? [peerId] : []);

  const { data: listing } = conversation.listing_id
    ? await createAdminClient()
        .from("listings")
        .select(
          "id, public_number, title, slug, status, category, household_size, size_m2, total_monthly, rented_conversation_id",
        )
        .eq("id", conversation.listing_id)
        .maybeSingle()
    : { data: null };

  return {
    id: conversation.id,
    peer: (peerId && peers.get(peerId)) || DELETED_PEER,
    isLister,
    listing: listing
      ? {
          id: listing.id,
          publicNumber: listing.public_number,
          title: listing.title,
          slug: listing.slug,
          status: listing.status,
          category: listing.category,
          householdSize: listing.household_size,
          sizeM2: listing.size_m2,
          total: listing.total_monthly,
          rentedConversationId: listing.rented_conversation_id,
        }
      : null,
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      isMine: message.sender_id === viewer.id,
      flagged: message.flagged,
    })),
  };
}

export async function getUnreadCount(viewerId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("lister_id, lister_unread, seeker_unread");

  return (data ?? []).reduce(
    (total, row) =>
      total + (row.lister_id === viewerId ? row.lister_unread : row.seeker_unread),
    0,
  );
}

export async function getTemplates(): Promise<
  { id: string; name: string; body: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_templates")
    .select("id, name, body")
    .order("created_at", { ascending: false });

  return data ?? [];
}
