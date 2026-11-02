import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createTestUser, deleteTestUser, login, testEmail } from "../helpers/auth";
import { adminDb } from "../helpers/env";

const LEGAL_PAGES = [
  ["/kullanim-sartlari", "Kullanım Şartları"],
  ["/kvkk", "KVKK Aydınlatma Metni"],
  ["/gizlilik", "Gizlilik Politikası"],
  ["/cerez-politikasi", "Çerez Politikası"],
  ["/hakkimizda", "Hakkımızda"],
  ["/iletisim", "İletişim"],
] as const;

test.describe("static pages", () => {
  for (const [path, title] of LEGAL_PAGES) {
    test(`${path} is marked as a draft`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.getByText("TASLAK: Hukuki inceleme gerekli")).toBeVisible();
    });
  }

  test("/guvenlik covers every topic", async ({ page }) => {
    await page.goto("/guvenlik");

    for (const topic of [
      "Kapora ve ön ödeme",
      "Piyasanın çok altındaki fiyatlar",
      "Sahte ilan nasıl anlaşılır",
    ]) {
      await expect(page.getByRole("heading", { name: topic })).toBeVisible();
    }

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("every footer link leads somewhere", async ({ page, request }) => {
    await page.goto("/");

    const hrefs = await page
      .getByRole("contentinfo")
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));

    for (const href of new Set(hrefs)) {
      if (href.startsWith("http")) continue;
      const response = await request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });
});

test.describe("share and install", () => {
  test("the default share image and manifest are served", async ({ request }) => {
    const image = await request.get("/opengraph-image");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");

    const manifest = await request.get("/manifest.webmanifest");
    expect((await manifest.json()).lang).toBe("tr");

    expect((await request.get("/icon-192.png")).status()).toBe(200);
  });
});

test("old rented listings answer 410, recent ones 200", async ({ request }) => {
  const email = testEmail("kaybolan");
  const userId = await createTestUser(email, {
    firstName: "Gül",
    lastName: "Test",
  });
  const { data: place } = await adminDb
    .from("listings")
    .select("province_id, district_id")
    .eq("status", "active")
    .limit(1)
    .single();

  const row = {
    owner_id: userId,
    province_id: place!.province_id,
    district_id: place!.district_id,
    status: "rented",
    published_at: new Date().toISOString(),
  };

  try {
    const { data } = await adminDb
      .from("listings")
      .insert([
        { ...row, title: "Eski", rented_at: new Date(Date.now() - 40 * 86_400_000).toISOString() },
        { ...row, title: "Yeni", rented_at: new Date().toISOString() },
      ])
      .select("public_number, title");

    const old = data!.find((item) => item.title === "Eski")!;
    const recent = data!.find((item) => item.title === "Yeni")!;

    expect((await request.get(`/ilan/${old.public_number}`)).status()).toBe(410);
    expect((await request.get(`/ilan/${recent.public_number}`)).status()).toBe(200);
  } finally {
    await deleteTestUser(userId);
  }
});

test.describe("rules from the brief", () => {
  test("phone options stay hidden while verification is off", async ({ page }) => {
    const email = testEmail("telefon");
    const userId = await createTestUser(email, {
      firstName: "Nil",
      lastName: "Test",
    });

    try {
      await login(page, email);
      await page.goto("/ilan-ver");

      await expect(page.getByRole("heading", { name: "İletişim" })).toBeVisible();
      await expect(page.getByText("Telefon numarasını ilanda göster")).toHaveCount(0);
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("UI copy has no em dashes, emoji or ASCII casing mistakes", () => {
    const raw = readFileSync("messages/tr.json", "utf8");

    expect(raw).not.toContain("—");
    expect(raw).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(raw).not.toMatch(/\bKIRA\b|\bILAN\b|\bILCE\b/);
  });

  test("no paid features or out-of-scope screens exist", async ({ request }) => {
    for (const path of ["/odeme", "/fiyatlar", "/premium"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });
});

test.describe("logged-in pages have no axe violations", () => {
  test.setTimeout(90_000);

  test("account, form and inbox", async ({ page }) => {
    const email = testEmail("erisilebilirlik");
    const userId = await createTestUser(email, {
      firstName: "Ece",
      lastName: "Test",
    });

    try {
      await login(page, email);

      for (const path of [
        "/ilan-ver",
        "/mesajlar",
        "/hesabim/ilanlarim",
        "/hesabim/favoriler",
        "/hesabim/profil",
        "/hesabim/ayarlar",
        "/hesabim/hesabi-sil",
      ]) {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations, path).toEqual([]);
      }
    } finally {
      await deleteTestUser(userId);
    }
  });
});
