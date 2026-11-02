import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import type { ListingSummary } from "@/lib/listings/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ListingGroup = "live" | "draft" | "inactive";

const GROUP_STATUSES: Record<ListingGroup, string[]> = {
  live: ["active", "pending_review"],
  draft: ["draft"],
  inactive: ["paused", "rented"],
};

export type MyListing = {
  id: string;
  publicNumber: number;
  slug: string;
  title: string;
  status: "active" | "pending_review" | "paused" | "rented" | "draft";
  cityName: string | null;
  street: string | null;
  createdAt: string;
  updatedAt: string;
  coverPath: string | null;
  qualityScore: number;
  messageCount: number;
  visitorCount: number;
  conversations: { id: string; label: string }[];
};

export async function getMyListings(
  viewer: Viewer,
  group: ListingGroup,
): Promise<{ listings: MyListing[]; counts: Record<ListingGroup, number> }> {
  const db = createAdminClient();

  const { data: rows } = await db
    .from("listings")
    .select(
      "id, public_number, slug, title, status, street, created_at, updated_at, quality_score, provinces(name)",
    )
    .eq("owner_id", viewer.id)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false });

  const all = rows ?? [];
  const counts = Object.fromEntries(
    (Object.keys(GROUP_STATUSES) as ListingGroup[]).map((key) => [
      key,
      all.filter((row) => GROUP_STATUSES[key].includes(row.status)).length,
    ]),
  ) as Record<ListingGroup, number>;

  const shown = all.filter((row) => GROUP_STATUSES[group].includes(row.status));
  const ids = shown.map((row) => row.id);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [photos, conversations, visits] = ids.length
    ? await Promise.all([
        db
          .from("listing_photos")
          .select("listing_id, storage_path, sort_order")
          .in("listing_id", ids)
          .order("sort_order"),
        db
          .from("conversations")
          .select("id, listing_id, seeker_id, created_at, last_message_at")
          .in("listing_id", ids)
          .order("last_message_at", { ascending: false }),
        db
          .from("events")
          .select("listing_id, session_id")
          .eq("name", "listing_view")
          .in("listing_id", ids)
          .gte("created_at", since),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const seekerIds = [
    ...new Set(
      (conversations.data ?? [])
        .map((row) => row.seeker_id as string | null)
        .filter((id): id is string => id !== null),
    ),
  ];
  const { data: seekers } = seekerIds.length
    ? await db
        .from("public_profiles")
        .select("id, display_name")
        .in("id", seekerIds)
    : { data: [] };
  const seekerNames = new Map(
    (seekers ?? []).map((row) => [row.id, row.display_name]),
  );

  const listings: MyListing[] = shown.map((row) => {
    const own = (conversations.data ?? []).filter(
      (item) => item.listing_id === row.id,
    );
    const province = row.provinces as unknown as { name: string } | null;

    return {
      id: row.id,
      publicNumber: row.public_number,
      slug: row.slug,
      title: row.title,
      status: row.status,
      cityName: province?.name ?? null,
      street: row.street,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      coverPath:
        (photos.data ?? []).find((photo) => photo.listing_id === row.id)
          ?.storage_path ?? null,
      qualityScore: row.quality_score,
      messageCount: own.filter((item) => item.last_message_at >= since).length,
      visitorCount: new Set(
        (visits.data ?? [])
          .filter((visit) => visit.listing_id === row.id)
          .map((visit) => visit.session_id),
      ).size,
      conversations: own.map((item) => ({
        id: item.id,
        label: seekerNames.get(item.seeker_id) ?? item.id.slice(0, 8),
      })),
    };
  });

  return { listings, counts };
}

export async function getFavoriteListings(): Promise<ListingSummary[]> {
  const supabase = await createClient();

  const { data: favorites } = await supabase
    .from("favorites")
    .select("listing_id")
    .order("created_at", { ascending: false });

  const ids = (favorites ?? []).map((row) => row.listing_id);
  if (ids.length === 0) return [];

  const { data: listings } = await supabase
    .from("public_listings")
    .select("*")
    .in("id", ids);

  const order = new Map(ids.map((id, index) => [id, index]));

  return ((listings ?? []) as ListingSummary[]).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}
