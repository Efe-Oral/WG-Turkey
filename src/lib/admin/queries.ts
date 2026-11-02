import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DateRange = { from: string; to: string };

export type MetricsTables = {
  top_districts: { district: string; listings: number }[];
  zero_results: {
    province: string;
    district: string;
    category: string;
    max_rent: string;
    searches: number;
  }[];
  delete_reasons: { reason: string; listings: number }[];
  flags: { flag: string; listings: number }[];
  sources: { source: string; sessions: number }[];
  funnel: Record<
    "visits" | "listing_views" | "messages" | "replies" | "rented",
    number
  >;
  messages_per_listing_mean: number | null;
  messages_per_listing_median: number | null;
  first_reply_minutes_median: number | null;
  reply_rate_72h: number | null;
  rented_within_14d_rate: number | null;
  pending_review: number;
  repeat_lister_rate: number | null;
  reports_per_100: number | null;
  reject_rate: number | null;
  retention_7d: number | null;
  retention_30d: number | null;
  boost_unique_listers: number;
  possible_business: { user_name: string; user_id: string; listings: number }[];
  supply_demand: {
    district: string;
    active_listings: number;
    searches: number;
    searches_per_listing: number | null;
  }[];
  median_rents: {
    district: string;
    category: string;
    listings: number;
    median_rent: number;
  }[];
};

export type DailyPoint = { date: string; values: Record<string, number> };

const DAY_MS = 86_400_000;

function dates({ from, to }: DateRange): string[] {
  const list: string[] = [];
  for (
    let time = Date.parse(from);
    time <= Date.parse(to);
    time += DAY_MS
  ) {
    list.push(new Date(time).toISOString().slice(0, 10));
  }
  return list;
}

export function previousRange({ from, to }: DateRange): DateRange {
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;

  return {
    from: new Date(Date.parse(from) - days * DAY_MS).toISOString().slice(0, 10),
    to: new Date(Date.parse(from) - DAY_MS).toISOString().slice(0, 10),
  };
}

/** Daily rows, including today. Missing metrics count as zero. */
export async function getDailySeries(
  range: DateRange,
  provinceId: string | null,
): Promise<DailyPoint[]> {
  const db = createAdminClient();

  // Nightly rows cover past days. Today is computed on demand.
  const today = new Date().toISOString().slice(0, 10);
  if (range.to >= today) {
    await db.rpc("compute_daily_metrics", { p_date: today });
  }

  const { data } = await db
    .from("daily_metrics")
    .select("date, metric_key, value")
    .eq("dimension_key", provinceId ? `province:${provinceId}` : "")
    .gte("date", range.from)
    .lte("date", range.to)
    .limit(20_000);

  const byDate = new Map<string, Record<string, number>>(
    dates(range).map((date) => [date, {}]),
  );
  for (const row of data ?? []) {
    const values = byDate.get(row.date);
    if (values) values[row.metric_key] = row.value;
  }

  return [...byDate].map(([date, values]) => ({ date, values }));
}

export async function getMetricsTables(
  range: DateRange,
  provinceId: string | null,
): Promise<MetricsTables> {
  const { data, error } = await createAdminClient().rpc("metrics_tables", {
    p_from: range.from,
    p_to: range.to,
    p_province: provinceId,
  });

  if (error) throw new Error(`Metrics: ${error.message}`);

  return data as MetricsTables;
}

export type ModerationItem = {
  id: string;
  publicNumber: number;
  title: string;
  ownerName: string | null;
  flags: string[];
  createdAt: string;
  isFirst: boolean;
};

export async function getModerationQueue(): Promise<ModerationItem[]> {
  const db = createAdminClient();

  const { data: rows } = await db
    .from("listings")
    .select("id, public_number, title, owner_id, moderation_flags, created_at")
    .eq("status", "pending_review")
    .order("created_at");

  const owners = [...new Set((rows ?? []).map((row) => row.owner_id))];
  const { data: profiles } = owners.length
    ? await db
        .from("public_profiles")
        .select("id, display_name")
        .in("id", owners)
    : { data: [] };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.display_name]));

  return (rows ?? []).map((row) => ({
    id: row.id,
    publicNumber: row.public_number,
    title: row.title,
    ownerName: names.get(row.owner_id) ?? null,
    flags: row.moderation_flags,
    createdAt: row.created_at,
    isFirst: row.moderation_flags.length === 0,
  }));
}

export type ReportItem = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  listingNumber: number | null;
  listingTitle: string | null;
  messageId: string | null;
  messageBody: string | null;
  userName: string | null;
};

export async function getOpenReports(): Promise<ReportItem[]> {
  const db = createAdminClient();

  const { data: rows } = await db
    .from("reports")
    .select(
      "id, reason, details, created_at, message_id, reported_user_id, listings(public_number, title), messages(body)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const userIds = (rows ?? [])
    .map((row) => row.reported_user_id as string | null)
    .filter((id): id is string => id !== null);
  const { data: profiles } = userIds.length
    ? await db
        .from("public_profiles")
        .select("id, display_name")
        .in("id", userIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.display_name]));

  return (rows ?? []).map((row) => {
    const listing = row.listings as unknown as {
      public_number: number;
      title: string;
    } | null;
    const message = row.messages as unknown as { body: string } | null;

    return {
      id: row.id,
      reason: row.reason,
      details: row.details,
      createdAt: row.created_at,
      listingNumber: listing?.public_number ?? null,
      listingTitle: listing?.title ?? null,
      messageId: row.message_id,
      messageBody: message?.body ?? null,
      userName: row.reported_user_id ? (names.get(row.reported_user_id) ?? null) : null,
    };
  });
}

export type AdminUser = {
  id: string;
  email: string | null;
  name: string;
  accountType: "private" | "business";
  banned: boolean;
  listings: {
    id: string;
    publicNumber: number;
    title: string;
    status: string;
    boosted: boolean;
  }[];
};

const MAX_USERS = 25;

/** Auth holds the emails, profiles hold the names, so both are searched. */
export async function searchUsers(query: string): Promise<AdminUser[]> {
  const db = createAdminClient();
  const term = query.trim();

  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emails = new Map(
    (authUsers?.users ?? []).map((user) => [user.id, user.email ?? null]),
  );

  let profileQuery = db
    .from("profiles")
    .select("id, first_name, last_name, account_type, banned_at")
    .order("created_at", { ascending: false })
    .limit(MAX_USERS);

  if (term) {
    const lower = term.toLocaleLowerCase("tr-TR");
    const matchedByEmail = [...emails]
      .filter(([, email]) => email?.toLowerCase().includes(lower))
      .map(([id]) => id)
      .slice(0, MAX_USERS);
    const safe = term.replace(/[,()%]/g, " ");

    profileQuery = profileQuery.or(
      [
        `first_name.ilike.%${safe}%`,
        `last_name.ilike.%${safe}%`,
        ...(matchedByEmail.length ? [`id.in.(${matchedByEmail.join(",")})`] : []),
      ].join(","),
    );
  }

  const { data: profiles } = await profileQuery;
  const ids = (profiles ?? []).map((profile) => profile.id);

  const { data: listings } = ids.length
    ? await db
        .from("listings")
        .select("id, owner_id, public_number, title, status, boosted_until")
        .in("owner_id", ids)
        .neq("status", "deleted")
    : { data: [] };

  const now = Date.now();

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: emails.get(profile.id) ?? null,
    name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    accountType: profile.account_type,
    banned: profile.banned_at !== null,
    listings: (listings ?? [])
      .filter((listing) => listing.owner_id === profile.id)
      .map((listing) => ({
        id: listing.id,
        publicNumber: listing.public_number,
        title: listing.title,
        status: listing.status,
        boosted:
          listing.boosted_until !== null &&
          Date.parse(listing.boosted_until) > now,
      })),
  }));
}
