// Conversations and 60 days of synthetic events, so the dashboard has data.
// Called by seed-dev.mjs.

const DAYS = 60;

const SOURCES = [
  { referrer: "google", utm: null },
  { referrer: "google", utm: null },
  { referrer: null, utm: null },
  { referrer: "whatsapp", utm: null },
  { referrer: "instagram", utm: "instagram" },
  { referrer: null, utm: "okul_afis" },
];

export async function seedExtras({ db, users, listings, helpers }) {
  const { must, between, pick, chance, daysFromNow } = helpers;

  const details = must(
    await db
      .from("listings")
      .select("id, owner_id, province_id, district_id, category")
      .in("id", listings.map((listing) => listing.id)),
    "listing details",
  );

  // Conversations: each of the first listings hears from a different user.
  for (const listing of details.slice(0, 8)) {
    const seeker = users.find((user) => user.id !== listing.owner_id);
    const createdAt = daysFromNow(-between(1, 20));

    const conversation = must(
      await db
        .from("conversations")
        .insert({
          listing_id: listing.id,
          lister_id: listing.owner_id,
          seeker_id: seeker.id,
          created_at: createdAt.toISOString(),
          last_message_at: createdAt.toISOString(),
          last_message_preview: "Merhaba, oda hâlâ müsait mi?",
          last_sender_id: seeker.id,
          lister_unread: 1,
          first_reply_at: chance(0.6)
            ? new Date(createdAt.getTime() + between(1, 40) * 3_600_000).toISOString()
            : null,
        })
        .select("id")
        .single(),
      "conversation",
    );

    must(
      await db.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: seeker.id,
        body: "Merhaba, oda hâlâ müsait mi? Bu hafta görmeye gelebilirim.",
        created_at: createdAt.toISOString(),
      }),
      "message",
    );
  }

  const events = [];
  const add = (name, createdAt, extra = {}) =>
    events.push({ name, created_at: createdAt.toISOString(), props: {}, ...extra });

  const province = details[0].province_id;

  for (let day = DAYS; day >= 1; day -= 1) {
    const sessions = between(12, 30);

    for (let index = 0; index < sessions; index += 1) {
      const at = new Date(daysFromNow(-day).getTime() - between(0, 80_000) * 1000);
      const session = crypto.randomUUID();
      const source = pick(SOURCES);
      const listing = pick(details);
      const user = chance(0.3) ? pick(users).id : null;

      const base = {
        session_id: session,
        user_id: user,
        province_id: province,
        referrer_source: source.referrer,
        utm_source: source.utm,
        device_type: chance(0.7) ? "mobile" : "desktop",
      };

      add("page_view", at, { ...base, props: { page_type: "results" } });
      add("search", at, {
        ...base,
        district_id: listing.district_id,
        props: { result_count: between(1, 40), category: listing.category },
      });

      if (chance(0.15)) {
        add("search_zero_results", at, {
          ...base,
          props: {
            province: "ankara",
            district: pick(["mamak", "cankaya", "kecioren"]),
            category: pick(["oda", "studyo"]),
            max_rent: pick(["5000", "7500"]),
          },
        });
      }
      if (chance(0.4)) add("filter_changed", at, base);
      if (chance(0.7)) {
        add("listing_view", at, {
          ...base,
          listing_id: listing.id,
          district_id: listing.district_id,
        });
        if (chance(0.2)) add("favorite_add", at, { ...base, listing_id: listing.id });
        if (chance(0.1)) {
          add("message_sent", at, {
            ...base,
            listing_id: listing.id,
            props: { first_in_conversation: true },
          });
        }
      }
    }

    const at = daysFromNow(-day);
    if (chance(0.5)) add("signup_completed", at, { user_id: pick(users).id });
    if (chance(0.5)) {
      add("listing_published", at, {
        user_id: pick(users).id,
        listing_id: pick(details).id,
        province_id: province,
      });
    }
    if (chance(0.12)) {
      add("listing_rented", at, {
        listing_id: pick(details).id,
        province_id: province,
        props: { rented_via_platform: pick(["yes", "yes", "no", "elsewhere"]) },
      });
    }
    if (chance(0.1)) {
      add("listing_deleted", at, {
        props: { reason: pick(["rented_here", "rented_elsewhere", "changed_mind", "other"]) },
      });
    }
    if (chance(0.2)) add("listing_approved", at, { province_id: province });
    if (chance(0.05)) add("listing_rejected", at, { province_id: province });
    if (chance(0.05)) {
      add("report_created", at, { province_id: province, props: { reason: "fake" } });
    }
    if (chance(0.15)) {
      add("boost_interest", at, {
        user_id: pick(users).id,
        listing_id: pick(details).id,
      });
    }
  }

  // Inserted in batches, because one request cannot carry them all.
  for (let start = 0; start < events.length; start += 500) {
    must(await db.from("events").insert(events.slice(start, start + 500)), "events");
  }

  for (let day = DAYS; day >= 0; day -= 1) {
    const date = daysFromNow(-day).toISOString().slice(0, 10);
    must(await db.rpc("compute_daily_metrics", { p_date: date }), "metrics");
  }

  console.log(`Seeded ${events.length} events and ${DAYS} days of metrics.`);
}
