import { expect, test, type Page } from "@playwright/test";
import { createTestUser, deleteTestUser, login, testEmail } from "../helpers/auth";
import { adminDb } from "../helpers/env";

test.setTimeout(90_000);

async function createOwner(label: string) {
  const email = testEmail(label);
  const userId = await createTestUser(email, {
    firstName: "Sena",
    lastName: "Owner",
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
      status: "active",
      title: `Hesap testi ${label}`,
      slug: "hesap-testi",
      province_id: place!.province_id,
      district_id: place!.district_id,
      street: "Test Sokak",
      rent: 9000,
      quality_score: 70,
      published_at: new Date().toISOString(),
    })
    .select("id, public_number")
    .single();

  return { email, userId, listing: listing! };
}

async function openMenu(page: Page) {
  await page.goto("/hesabim/ilanlarim");
  await page.getByRole("button", { name: "İlan seçenekleri" }).click();
}

async function listingRow(id: string) {
  const { data } = await adminDb
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

test("İlanlarım shows free per-listing stats", async ({ page }) => {
  const owner = await createOwner("istatistik");

  try {
    await login(page, owner.email);
    await page.goto("/hesabim/ilanlarim");

    await expect(page.getByRole("heading", { name: "1 yayında ilan" })).toBeVisible();
    await expect(page.getByText("Son 30 günde mesaj:")).toBeVisible();
    await expect(page.getByText("Kalite puanı")).toBeVisible();
    await expect(page.getByText("Yayında", { exact: true }).last()).toBeVisible();
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("marking rented records rented_via_platform", async ({ page }) => {
  const owner = await createOwner("kiralik");

  try {
    await login(page, owner.email);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "Kiralandı olarak işaretle" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Ev arkadaşını EvArkadaşıAra üzerinden mi buldun?")).toBeVisible();
    await dialog.getByRole("radio", { name: "Başka bir yerden" }).check();
    await dialog.getByRole("button", { name: "Kaydet" }).click();
    await expect(dialog).toBeHidden();

    const listing = await listingRow(owner.listing.id);
    expect(listing?.status).toBe("rented");
    expect(listing?.rented_via_platform).toBe("elsewhere");

    const { data: events } = await adminDb
      .from("events")
      .select("props")
      .eq("name", "listing_rented")
      .eq("listing_id", owner.listing.id);
    expect(events?.[0]?.props).toEqual({ rented_via_platform: "elsewhere" });

    // The public page says it is gone and still answers 200.
    const response = await page.goto(`/ilan/${owner.listing.public_number}-hesap-testi`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Bu ilan artık yayında değil.")).toBeVisible();
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("pause and resume change the status", async ({ page }) => {
  const owner = await createOwner("duraklat");

  try {
    await login(page, owner.email);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "Duraklat" }).click();
    await expect(async () => {
      expect((await listingRow(owner.listing.id))?.status).toBe("paused");
    }).toPass();

    await page.goto("/hesabim/ilanlarim?durum=pasif");
    await page.getByRole("button", { name: "İlan seçenekleri" }).click();
    await page.getByRole("menuitem", { name: "Yayına al" }).click();
    await expect(async () => {
      expect((await listingRow(owner.listing.id))?.status).toBe("active");
    }).toPass();
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("deleting a listing requires a reason", async ({ page, request }) => {
  const owner = await createOwner("sil");

  try {
    await login(page, owner.email);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "Sil" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Sil" })).toBeDisabled();
    await dialog.getByRole("radio", { name: "Vazgeçtim" }).check();
    await dialog.getByRole("button", { name: "Sil" }).click();
    await expect(dialog).toBeHidden();

    const listing = await listingRow(owner.listing.id);
    expect(listing?.status).toBe("deleted");
    expect(listing?.delete_reason).toBe("changed_mind");

    const response = await request.get(`/ilan/${owner.listing.public_number}`);
    expect(response.status()).toBe(404);
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("the boost item shows a toast and logs interest", async ({ page }) => {
  const owner = await createOwner("boost");

  try {
    await login(page, owner.email);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "Öne çıkar (yakında)" }).click();

    await expect(page.getByText("Bu özellik yakında geliyor.").first()).toBeVisible();
    await expect(async () => {
      const { count } = await adminDb
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("name", "boost_interest")
        .eq("listing_id", owner.listing.id);
      expect(count).toBe(1);
    }).toPass();
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("the renewal link keeps a listing up, a forged one does not", async ({
  request,
  page,
}) => {
  const owner = await createOwner("yenile");

  try {
    await adminDb
      .from("listings")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", owner.listing.id);

    const forged = await page.goto(`/ilan/yenile?t=${owner.listing.id}.9999999999999.sahte`);
    expect(forged?.status()).toBe(200);
    await expect(page.getByText("geçersiz veya süresi dolmuş")).toBeVisible();
    expect((await listingRow(owner.listing.id))?.status).toBe("paused");

    const signed = await request.get(`/api/test-renew-link?id=${owner.listing.id}`);
    const { url } = (await signed.json()) as { url: string };

    await page.goto(new URL(url).pathname + new URL(url).search);
    await expect(page.getByRole("heading", { name: "İlanın yayında kaldı" })).toBeVisible();
    expect((await listingRow(owner.listing.id))?.status).toBe("active");
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("profile changes are saved and change the display name", async ({ page }) => {
  const owner = await createOwner("profil");

  try {
    await login(page, owner.email);
    await page.goto("/hesabim/profil");

    await page.getByRole("spinbutton", { name: "Doğum yılı" }).fill("1998");
    await page.getByRole("combobox", { name: "Görünen ad" }).selectOption("full");
    await page.getByRole("combobox", { name: "Durum" }).selectOption("student");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Kaydedildi.")).toBeVisible();

    const { data } = await adminDb
      .from("public_profiles")
      .select("display_name")
      .eq("id", owner.userId)
      .single();
    expect(data?.display_name).toBe("Sena Owner");
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("email notifications can be switched off", async ({ page }) => {
  const owner = await createOwner("ayar");

  try {
    await login(page, owner.email);
    await page.goto("/hesabim/ayarlar");
    await page.getByRole("switch").click();

    await expect(async () => {
      const { data } = await adminDb
        .from("profiles")
        .select("email_notifications")
        .eq("id", owner.userId)
        .single();
      expect(data?.email_notifications).toBe(false);
    }).toPass();
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("a private note is saved per user", async ({ page }) => {
  const owner = await createOwner("not");
  const { data: other } = await adminDb
    .from("listings")
    .select("id, public_number, slug")
    .eq("status", "active")
    .neq("owner_id", owner.userId)
    .limit(1)
    .single();

  try {
    await login(page, owner.email);
    await page.goto(`/ilan/${other!.public_number}-${other!.slug}`);
    await page.getByRole("button", { name: "Not al" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("Cumartesi ara");
    await dialog.getByRole("button", { name: "Kaydet" }).click();
    await expect(dialog.getByText("Not kaydedildi.")).toBeVisible();

    const { data } = await adminDb
      .from("listing_notes")
      .select("note")
      .eq("user_id", owner.userId)
      .single();
    expect(data?.note).toBe("Cumartesi ara");
  } finally {
    await deleteTestUser(owner.userId);
  }
});

test("deleting the account removes personal data", async ({ page }) => {
  const owner = await createOwner("kvkk");
  const seekerEmail = testEmail("kvkk-karsi");
  const seekerId = await createTestUser(seekerEmail, {
    firstName: "Mira",
    lastName: "Seeker",
  });

  const { data: conversation } = await adminDb
    .from("conversations")
    .insert({
      listing_id: owner.listing.id,
      lister_id: owner.userId,
      seeker_id: seekerId,
      last_message_preview: "Merhaba",
    })
    .select("id")
    .single();
  await adminDb.from("messages").insert({
    conversation_id: conversation!.id,
    sender_id: owner.userId,
    body: "Ev müsait.",
  });
  await adminDb
    .from("events")
    .insert({ name: "login", user_id: owner.userId });

  try {
    await login(page, owner.email);
    await page.goto("/hesabim/hesabi-sil");

    const button = page.getByRole("button", { name: "Hesabımı sil" });
    await expect(button).toBeDisabled();
    await page.getByRole("textbox", { name: "Onaylamak için SİL yaz" }).fill("SİL");
    await button.click();

    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });

    const { data: authUser } = await adminDb.auth.admin.getUserById(owner.userId);
    expect(authUser.user).toBeNull();

    const profile = await adminDb
      .from("profiles")
      .select("id")
      .eq("id", owner.userId)
      .maybeSingle();
    expect(profile.data).toBeNull();

    expect(await listingRow(owner.listing.id)).toBeNull();

    const { count: events } = await adminDb
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", owner.userId);
    expect(events).toBe(0);

    // The other person keeps the conversation, with the name erased.
    const { data: kept } = await adminDb
      .from("conversations")
      .select("lister_id, seeker_id")
      .eq("id", conversation!.id)
      .single();
    expect(kept).toEqual({ lister_id: null, seeker_id: seekerId });

    const { data: messages } = await adminDb
      .from("messages")
      .select("sender_id")
      .eq("conversation_id", conversation!.id);
    expect(messages).toEqual([{ sender_id: null }]);
  } finally {
    await adminDb.from("conversations").delete().eq("id", conversation!.id);
    await deleteTestUser(seekerId);
    await adminDb.auth.admin.deleteUser(owner.userId).catch(() => undefined);
  }
});
