import { expect, test, type Page } from "@playwright/test";
import { createTestUser, deleteTestUser, login, testEmail } from "../helpers/auth";
import { adminDb, env } from "../helpers/env";

test.setTimeout(90_000);

async function createAdmin(label: string) {
  const email = testEmail(label);
  const userId = await createTestUser(email, {
    firstName: "Admin",
    lastName: "Test",
  });
  await adminDb.from("profiles").update({ role: "admin" }).eq("id", userId);
  return { email, userId };
}

async function createOwner(status: string, extra: Record<string, unknown> = {}) {
  const email = testEmail("sahip");
  const userId = await createTestUser(email, {
    firstName: "Oya",
    lastName: "Sahip",
  });
  const { data: place } = await adminDb
    .from("listings")
    .select("province_id, district_id")
    .eq("status", "active")
    .limit(1)
    .single();

  const { data: listing } = await adminDb
    .from("listings")
    .insert({
      owner_id: userId,
      status,
      title: `Yönetim testi ${Date.now()}`,
      slug: "yonetim-testi",
      province_id: place!.province_id,
      district_id: place!.district_id,
      rent: 10000,
      published_at: new Date().toISOString(),
      ...extra,
    })
    .select("id, public_number, title")
    .single();

  return { email, userId, listing: listing! };
}

async function statusOf(listingId: string) {
  const { data } = await adminDb
    .from("listings")
    .select("status, reject_reason, moderation_flags")
    .eq("id", listingId)
    .single();
  return data;
}

test.describe("access", () => {
  const routes = [
    "/admin",
    "/admin/metrics",
    "/admin/moderasyon",
    "/admin/sikayetler",
    "/admin/kullanicilar",
  ];

  test("visitors get 404 on every admin route", async ({ request }) => {
    for (const route of routes) {
      expect((await request.get(route)).status(), route).toBe(404);
    }
  });

  test("logged-in non-admins get 404 on every admin route", async ({ page }) => {
    const email = testEmail("normal");
    const userId = await createTestUser(email, {
      firstName: "Normal",
      lastName: "Kullanici",
    });

    try {
      await login(page, email);
      for (const route of routes) {
        const response = await page.goto(route);
        expect(response?.status(), route).toBe(404);
      }
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("the public API only reads, and only public data", async () => {
    const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
    const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const headers = {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    };

    for (const table of ["events", "daily_metrics", "listings", "profiles", "messages"]) {
      const read = await fetch(`${base}/${table}?select=*&limit=1`, { headers });
      expect(read.status, table).toBe(401);
    }

    // Views skip Row Level Security, so writes must fail at the grant level.
    const noRow = "id=eq.00000000-0000-0000-0000-000000000000";
    for (const [table, body] of [
      ["public_profiles", { avatar_url: "x" }],
      ["public_listings", { title: "x" }],
      ["provinces", { name: "x" }],
      ["listing_photos", { sort_order: 1 }],
    ] as const) {
      const write = await fetch(`${base}/${table}?${noRow}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      expect(write.ok, table).toBe(false);
    }
  });
});

test.describe("dashboard", () => {
  test("shows every section with data from the seed", async ({ page }) => {
    const admin = await createAdmin("metrik");

    try {
      await login(page, admin.email);
      await page.goto("/admin/metrics?aralik=90&karsilastir=1");

      for (const section of [
        "Kuzey yıldızı",
        "Arz",
        "Talep",
        "Eşleşme",
        "Güven",
        "Büyüme",
        "Para keşfi",
      ]) {
        await expect(
          page.getByRole("heading", { name: section, exact: true }),
        ).toBeVisible();
      }

      for (const kpi of [
        "Aktif ilan",
        "Tekil oturum",
        "Sıfır sonuçlu arama oranı",
        "Yanıt oranı (72 saat)",
        "100 ilan başına şikayet",
        "7 gün geri dönüş",
        "Öne çıkar tıklamaları",
      ]) {
        await expect(page.getByText(kpi, { exact: true }).first()).toBeVisible();
      }

      await expect(page.getByRole("heading", { name: "Kaynak dağılımı" })).toBeVisible();
      await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
      await expect(page.getByRole("cell", { name: "Çankaya" }).first()).toBeVisible();
    } finally {
      await deleteTestUser(admin.userId);
    }
  });

  test("a table downloads as CSV", async ({ page }) => {
    const admin = await createAdmin("csv");

    try {
      await login(page, admin.email);
      await page.goto("/admin/metrics?aralik=90");

      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "CSV indir: İlçelere göre aktif ilan" })
        .click();
      expect((await download).suggestedFilename()).toBe("ilce-aktif-ilan.csv");
    } finally {
      await deleteTestUser(admin.userId);
    }
  });

  test("the province filter changes the URL", async ({ page }) => {
    const admin = await createAdmin("il");

    try {
      await login(page, admin.email);
      await page.goto("/admin/metrics");

      await page.getByRole("combobox", { name: "İl" }).selectOption({ label: "Ankara" });
      await page.getByRole("button", { name: "Uygula" }).click();
      await expect(page).toHaveURL(/il=[0-9a-f-]{36}/);
      await expect(page.getByRole("heading", { name: "Arz", exact: true })).toBeVisible();
    } finally {
      await deleteTestUser(admin.userId);
    }
  });
});

test.describe("moderation", () => {
  test("approving a listing publishes it", async ({ page, request }) => {
    const admin = await createAdmin("onay");
    const owner = await createOwner("pending_review");

    try {
      expect((await request.get(`/ilan/${owner.listing.public_number}`)).status()).toBe(404);

      await login(page, admin.email);
      await page.goto("/admin/moderasyon");

      const row = page.getByRole("listitem").filter({ hasText: owner.listing.title });
      await row.getByRole("button", { name: "Onayla" }).click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });

      expect((await statusOf(owner.listing.id))?.status).toBe("active");
      expect(
        (await request.get(`/ilan/${owner.listing.public_number}-yonetim-testi`)).status(),
      ).toBe(200);
    } finally {
      await deleteTestUser(owner.userId);
      await deleteTestUser(admin.userId);
    }
  });

  test("rejecting needs a reason and stores it", async ({ page }) => {
    const admin = await createAdmin("red");
    const owner = await createOwner("pending_review");

    try {
      await login(page, admin.email);
      await page.goto("/admin/moderasyon");

      const row = page.getByRole("listitem").filter({ hasText: owner.listing.title });
      await row.getByRole("button", { name: "Reddet", exact: true }).click();

      const send = row.getByRole("button", { name: "Reddet ve bildir" });
      await expect(send).toBeDisabled();
      await row.getByRole("combobox", { name: "Red sebebi" }).selectOption("fake");
      await row.getByRole("textbox", { name: "Açıklama" }).fill("Fotoğraflar uyuşmuyor");
      await send.click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });

      const listing = await statusOf(owner.listing.id);
      expect(listing?.status).toBe("draft");
      expect(listing?.reject_reason).toContain("Fotoğraflar uyuşmuyor");
    } finally {
      await deleteTestUser(owner.userId);
      await deleteTestUser(admin.userId);
    }
  });
});

async function report(page: Page, reason: string) {
  await page.getByRole("button", { name: "Şikayet et" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: reason }).check();
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByText("Şikayetini inceleyeceğiz")).toBeVisible();
}

test.describe("reports", () => {
  test("three open reports pause the listing automatically", async ({ page }) => {
    const owner = await createOwner("active");
    const reporters: string[] = [];

    try {
      for (let index = 0; index < 2; index += 1) {
        const id = await createTestUser(testEmail("sikayetci"));
        reporters.push(id);
        await adminDb.from("reports").insert({
          reporter_id: id,
          listing_id: owner.listing.id,
          reason: "fake",
        });
      }

      const email = testEmail("ucuncu");
      reporters.push(
        await createTestUser(email, { firstName: "Tan", lastName: "Sikayet" }),
      );

      await login(page, email);
      await page.goto(`/ilan/${owner.listing.public_number}-yonetim-testi`);
      await report(page, "Sahte ilan");

      await expect(async () => {
        expect((await statusOf(owner.listing.id))?.status).toBe("paused");
      }).toPass();
    } finally {
      await deleteTestUser(owner.userId);
      for (const id of reporters) await deleteTestUser(id);
    }
  });

  test("banning from a report pauses listings and hides the user", async ({
    page,
  }) => {
    const admin = await createAdmin("engel");
    const owner = await createOwner("active");
    await adminDb.from("reports").insert({
      listing_id: owner.listing.id,
      reason: "scam",
      details: `Engel testi ${owner.listing.title}`,
    });

    try {
      await login(page, admin.email);
      await page.goto("/admin/sikayetler");

      const row = page
        .getByRole("listitem")
        .filter({ hasText: `Engel testi ${owner.listing.title}` });
      await row.getByRole("button", { name: "Kullanıcıyı engelle" }).click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });

      expect((await statusOf(owner.listing.id))?.status).toBe("paused");

      const { data } = await adminDb
        .from("profiles")
        .select("banned_at")
        .eq("id", owner.userId)
        .single();
      expect(data?.banned_at).not.toBeNull();
    } finally {
      await deleteTestUser(owner.userId);
      await deleteTestUser(admin.userId);
    }
  });
});

test("an admin can boost a listing and set a business account", async ({ page }) => {
  const admin = await createAdmin("kullanici");
  const owner = await createOwner("active");

  try {
    await login(page, admin.email);
    await page.goto(`/admin/kullanicilar?q=${encodeURIComponent(owner.email)}`);

    const row = page.getByRole("listitem").filter({ hasText: owner.email });
    await row.getByRole("button", { name: "7 gün öne çıkar" }).click();
    await expect(row.getByRole("button", { name: "Öne çıkarmayı kaldır" })).toBeVisible({
      timeout: 15_000,
    });

    await row.getByRole("combobox", { name: "Hesap türü" }).selectOption("business");

    await expect(async () => {
      const { data } = await adminDb
        .from("profiles")
        .select("account_type")
        .eq("id", owner.userId)
        .single();
      expect(data?.account_type).toBe("business");
    }).toPass();

    const { data: listing } = await adminDb
      .from("listings")
      .select("boosted_until, boost_source")
      .eq("id", owner.listing.id)
      .single();
    expect(listing?.boost_source).toBe("admin_test");

    await page.goto(`/ilan/${owner.listing.public_number}-yonetim-testi`);
    await expect(page.getByText("İşletme").first()).toBeVisible();
  } finally {
    await deleteTestUser(owner.userId);
    await deleteTestUser(admin.userId);
  }
});

test.describe("automatic checks", () => {
  test("expiry pauses listings older than 30 days", async () => {
    const owner = await createOwner("active", {
      last_bumped_at: new Date(Date.now() - 31 * 86_400_000).toISOString(),
    });

    try {
      await adminDb.rpc("expire_listings");
      expect((await statusOf(owner.listing.id))?.status).toBe("paused");

      const { count } = await adminDb
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("name", "listing_expired")
        .eq("listing_id", owner.listing.id);
      expect(count).toBe(1);
    } finally {
      await deleteTestUser(owner.userId);
    }
  });

  test("browser events reach the events table", async ({ page }) => {
    const { data: seed } = await adminDb
      .from("listings")
      .select("id, public_number, slug")
      .eq("status", "active")
      .limit(1)
      .single();

    await page.goto(`/ilan/${seed!.public_number}-${seed!.slug}`);
    await page.waitForResponse("**/api/events");

    const session = await page.evaluate(() => sessionStorage.getItem("ea_session"));
    expect(session).toBeTruthy();

    await expect(async () => {
      const { count } = await adminDb
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session!)
        .eq("name", "listing_view");
      expect(count).toBe(1);
    }).toPass();
  });

  test("forbidden event names are refused", async ({ request }) => {
    const response = await request.post("/api/events", {
      data: {
        sessionId: crypto.randomUUID(),
        deviceType: "desktop",
        events: [{ name: "listing_rented" }],
      },
    });
    expect(response.status()).toBe(400);
  });
});
