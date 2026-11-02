import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  clientAs,
  createTestUser,
  deleteTestUser,
  login,
  loginWithModal,
  openLogin,
  testEmail,
} from "../helpers/auth";
import { adminDb, env } from "../helpers/env";

const DESCRIPTION = Array.from({ length: 12 }, () => "Oda geniş aydınlık ve sessiz.").join(" ");

async function jpegWithGps(shade: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 2400,
      height: 1800,
      channels: 3,
      background: { r: shade, g: shade, b: shade },
    },
  })
    .withExif({
      IFD0: { Copyright: "secret-owner" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "39/1 55/1 0/1",
        GPSLongitudeRef: "E",
        GPSLongitude: "32/1 51/1 0/1",
      },
    })
    .jpeg()
    .toBuffer();
}

async function fillRequiredFields(page: Page, title: string) {
  await page.getByRole("textbox", { name: "İlan başlığı *" }).fill(title);

  await page.getByRole("combobox", { name: "Şehir" }).fill("Ankara");
  await page.getByRole("option", { name: "Ankara" }).click();

  const district = page.getByRole("combobox", { name: "İlçe *" });
  await expect(district.getByRole("option", { name: "Çankaya" })).toBeAttached();
  await district.selectOption({ label: "Çankaya" });

  await page.getByRole("combobox", { name: "Mahalle *" }).fill("Bahçelievler");
  await page.getByRole("textbox", { name: "Sokak / Cadde *" }).fill("7. Cadde");
  await page.getByRole("textbox", { name: "Bina no" }).fill("42");

  await page.getByRole("button", { name: "Bugün" }).click();
  await page.getByRole("spinbutton", { name: "Oda büyüklüğü m² *" }).fill("15");
  await page.getByRole("spinbutton", { name: "Kira (TL) *" }).fill("12500");

  await page.getByRole("combobox", { name: "Ev kişi sayısı *" }).selectOption("3");
  await page
    .getByRole("spinbutton", { name: "Şu anki sakinler: Erkek sayısı *" })
    .fill("1");
  await page.getByRole("combobox", { name: "Aranan cinsiyet *" }).selectOption("any");
  await page.getByRole("checkbox", { name: "Öğrenci evi" }).check();

  await page.getByRole("textbox", { name: "Oda" }).fill(DESCRIPTION);
}

async function uploadPhotos(page: Page, count: number) {
  const files = await Promise.all(
    Array.from({ length: count }, async (_, index) => ({
      name: `foto-${index}.jpg`,
      mimeType: "image/jpeg",
      buffer: await jpegWithGps(100 + index * 40),
    })),
  );

  await page.getByTestId("photo-input").setInputFiles(files);
  await expect(page.getByTestId("photo-tile")).toHaveCount(count, {
    timeout: 30_000,
  });
}

test.describe("auth", () => {
  test("a new user signs up with the code and finishes onboarding", async ({
    page,
  }) => {
    const email = testEmail("kayit");
    const userId = await createTestUser(email);

    try {
      await page.goto("/");
      await openLogin(page);

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Hoş geldin" }),
      ).toBeVisible();
      await expect(dialog.getByText("Kullanım Şartları")).toBeVisible();

      await loginWithModal(page, email);

      await expect(
        dialog.getByRole("heading", { name: "Son bir adım" }),
      ).toBeVisible();

      // Consent is required.
      await dialog.getByRole("textbox", { name: "Ad", exact: true }).fill("Deniz");
      await dialog.getByRole("textbox", { name: "Soyadı" }).fill("Test");
      await dialog.getByRole("button", { name: "Tamamla" }).click();
      await expect(dialog.getByText("onay vermelisin")).toBeVisible();

      await dialog.getByRole("checkbox").check();
      await dialog.getByRole("button", { name: "Tamamla" }).click();
      await expect(dialog).toBeHidden();

      const { data } = await adminDb
        .from("profiles")
        .select("first_name, kvkk_consent_at, kvkk_text_version")
        .eq("id", userId)
        .single();
      expect(data?.first_name).toBe("Deniz");
      expect(data?.kvkk_consent_at).not.toBeNull();
      expect(data?.kvkk_text_version).toBeTruthy();
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("a wrong code shows an error", async ({ page }) => {
    await page.route("**/auth/v1/otp*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.goto("/");
    await openLogin(page);

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "E-posta" }).fill(testEmail("yanlis"));
    await dialog.getByRole("button", { name: "Devam et" }).click();
    await dialog.getByRole("textbox", { name: "6 haneli" }).fill("000000");
    await dialog.getByRole("button", { name: "Doğrula" }).click();

    await expect(dialog.getByText("Kod hatalı")).toBeVisible();
    await expect(
      dialog.getByText(/saniye sonra tekrar gönderebilirsin/),
    ).toBeVisible();
  });

  test("the posting page asks a visitor to log in", async ({ page }) => {
    await page.goto("/ilan-ver");

    await expect(page.getByText("İlan vermek için giriş yapmalısın.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("favoriting while logged out continues after login", async ({ page }) => {
    const email = testEmail("favori");
    const userId = await createTestUser(email, {
      firstName: "Ece",
      lastName: "Test",
    });

    try {
      await page.goto("/ankara");
      await page
        .getByRole("button", { name: "Favorilere ekle" })
        .first()
        .click();
      await loginWithModal(page, email);
      await expect(page.getByRole("dialog")).toBeHidden();

      await expect(
        page.getByRole("button", { name: "Favorilerden çıkar" }).first(),
      ).toBeVisible();

      await expect(async () => {
        const { count } = await adminDb
          .from("favorites")
          .select("listing_id", { count: "exact", head: true })
          .eq("user_id", userId);
        expect(count).toBe(1);
      }).toPass();
    } finally {
      await deleteTestUser(userId);
    }
  });
});

test.describe("posting", () => {
  test.setTimeout(120_000);

  test("a new user publishes a listing that lands in review", async ({
    page,
    request,
  }) => {
    const email = testEmail("ilan");
    const userId = await createTestUser(email, {
      firstName: "Kerem",
      lastName: "Test",
    });

    try {
      await login(page, email);
      await page.goto("/ilan-ver");
      await expect(page.getByRole("heading", { name: "İlan ver" })).toBeVisible();

      // Publishing an empty form lists what is missing, in Turkish.
      await page.getByRole("button", { name: "Yayınla" }).click();
      await expect(
        page.getByText("Yayınlamadan önce işaretli alanları düzelt."),
      ).toBeVisible();
      await expect(page.getByText("Bu alan zorunlu.").first()).toBeVisible();

      const title = `Test odası ${Date.now()}`;
      await fillRequiredFields(page, title);
      await expect(page.getByText("Toplam kelime: 60")).toBeVisible();
      await expect(page.getByText("12.500 TL").first()).toBeVisible();

      await uploadPhotos(page, 3);
      await expect(page.getByText("Kapak")).toHaveCount(1);

      await page.getByRole("button", { name: "Yayınla" }).click();
      await expect(page).toHaveURL(/\/ilan-ver\/tamamlandi/, { timeout: 30_000 });
      await expect(page.getByText("İlanın incelemeye alındı.")).toBeVisible();

      const { data: listing } = await adminDb
        .from("listings")
        .select("id, public_number, status, building_no, public_lat, quality_score")
        .eq("owner_id", userId)
        .single();

      expect(listing?.status).toBe("pending_review");
      expect(listing?.building_no).toBe("42");
      expect(listing?.quality_score).toBeGreaterThan(0);

      // No photo in storage keeps its EXIF or GPS.
      const { data: photos } = await adminDb
        .from("listing_photos")
        .select("storage_path, phash")
        .eq("listing_id", listing!.id);
      expect(photos).toHaveLength(3);

      for (const photo of photos!) {
        expect(photo.phash).toBeTruthy();
        const { data: file } = await adminDb.storage
          .from("listing-photos")
          .download(photo.storage_path);
        const bytes = Buffer.from(await file!.arrayBuffer());

        const metadata = await sharp(bytes).metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.exif).toBeUndefined();
        expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(1600);
        expect(bytes.includes("secret-owner")).toBe(false);
      }

      // The owner sees it with a notice, the public gets a 404.
      await page.goto(`/ilan/${listing!.public_number}`);
      await expect(page.getByText("Bu ilan incelemede.")).toBeVisible();

      const publicResponse = await request.get(`/ilan/${listing!.public_number}`);
      expect(publicResponse.status()).toBe(404);

      await page.goto(`/ilan/${listing!.public_number}/duzenle`);
      await expect(page.getByRole("heading", { name: "İlanı düzenle" })).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Bina no" })).toHaveValue("42");
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("autosave creates a draft without pressing anything", async ({ page }) => {
    const email = testEmail("taslak");
    const userId = await createTestUser(email, {
      firstName: "Ada",
      lastName: "Test",
    });

    try {
      await login(page, email);
      await page.goto("/ilan-ver");
      await page.getByRole("textbox", { name: "İlan başlığı *" }).fill("Taslak ilan");
      await page.getByRole("textbox", { name: "Bina no" }).focus();

      await expect(page.getByText("Taslak kaydedildi")).toBeVisible({
        timeout: 15_000,
      });

      const { data } = await adminDb
        .from("listings")
        .select("title, status")
        .eq("owner_id", userId)
        .single();
      expect(data).toEqual({ title: "Taslak ilan", status: "draft" });
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("an owner cannot approve their own listing through the API", async () => {
    const email = testEmail("atlatma");
    const userId = await createTestUser(email, {
      firstName: "Efe",
      lastName: "Test",
    });

    try {
      const { data: listing } = await adminDb
        .from("listings")
        .insert({ owner_id: userId, title: "Kendi ilanım", status: "pending_review" })
        .select("id")
        .single();

      const client = await clientAs(email);

      const update = await client
        .from("listings")
        .update({ status: "active" })
        .eq("id", listing!.id)
        .select();
      expect(update.error?.code).toBe("42501");

      const insert = await client
        .from("listings")
        .insert({ owner_id: userId, status: "active", title: "Hile" });
      expect(insert.error?.code).toBe("42501");

      const role = await client
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId);
      expect(role.error?.code).toBe("42501");

      const { data } = await adminDb
        .from("listings")
        .select("status")
        .eq("id", listing!.id)
        .single();
      expect(data?.status).toBe("pending_review");
    } finally {
      await deleteTestUser(userId);
    }
  });
});

test.describe("contact masking", () => {
  test("visitors see a mask, logged-in users see the text", async ({
    page,
    browser,
  }) => {
    const email = testEmail("maske");
    const userId = await createTestUser(email, {
      firstName: "Lale",
      lastName: "Test",
    });

    const { data: seed } = await adminDb
      .from("listings")
      .select("id, public_number, slug, desc_other")
      .eq("status", "active")
      .limit(1)
      .single();
    const phone = "0532 123 45 67";

    try {
      await adminDb
        .from("listings")
        .update({ desc_other: `Bana yaz: ${phone}` })
        .eq("id", seed!.id);

      const visitor = await browser.newPage();
      await visitor.goto(`/ilan/${seed!.public_number}-${seed!.slug}`);
      await visitor.getByRole("tab", { name: "Diğer" }).click();
      await expect(visitor.getByText("Bana yaz: •••")).toBeVisible();
      await expect(visitor.getByText("giriş yapınca görünür")).toBeVisible();
      expect(await visitor.content()).not.toContain(phone);
      await visitor.close();

      await login(page, email);
      await page.goto(`/ilan/${seed!.public_number}-${seed!.slug}`);
      await page.getByRole("tab", { name: "Diğer" }).click();
      await expect(page.getByText(`Bana yaz: ${phone}`)).toBeVisible();
    } finally {
      await adminDb
        .from("listings")
        .update({ desc_other: seed!.desc_other })
        .eq("id", seed!.id);
      await deleteTestUser(userId);
    }
  });
});

test("the secret key never reaches the browser", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.url().endsWith(".js")) {
      scripts.push(await response.text().catch(() => ""));
    }
  });

  await page.goto("/ankara");
  await page.waitForTimeout(500);

  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) {
    expect(script).not.toContain(env.SUPABASE_SECRET_KEY);
  }
});
