import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminDb, env } from "../helpers/env";

async function firstListing() {
  const { data } = await adminDb
    .from("listings")
    .select("public_number, slug, lat, lng, building_no, public_lat, public_lng")
    .eq("status", "active")
    .eq("category", "room")
    .limit(1)
    .single();

  return data!;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("results page", () => {
  test("shows Ankara listings in a single column", async ({ page }) => {
    await page.goto("/ankara");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Ankara'da ev arkadaşı odaları, stüdyolar ve kiralık daireler",
      }),
    ).toBeVisible();
    await expect(page.getByText(/^\d+ ilan$/)).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(20);

    const boxes = await page.locator("main article").evaluateAll((cards) =>
      cards.slice(0, 2).map((card) => card.getBoundingClientRect().left),
    );
    expect(boxes[0]).toBe(boxes[1]);
  });

  test("category paths and district paths work", async ({ page }) => {
    await page.goto("/ankara/oda");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ankara'da ev arkadaşı odaları",
    );

    await page.goto("/ankara/cankaya");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Çankaya'da",
    );

    await page.goto("/ankara/cankaya/oda");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Çankaya'da ev arkadaşı odaları",
    );
  });

  test("unknown cities and districts return 404", async ({ request }) => {
    expect((await request.get("/atlantis")).status()).toBe(404);
    expect((await request.get("/ankara/atlantis")).status()).toBe(404);
  });

  test("a filter changes the results and syncs to the URL", async ({ page }) => {
    await page.goto("/ankara");

    await page.getByRole("combobox", { name: "Kira (en fazla)" }).click();
    await page.getByRole("option", { name: "12.500 TL" }).click();

    await expect(page).toHaveURL(/kira=12500/);
    await expect(page.locator("main article").first()).toBeVisible();
    const prices = await page
      .locator("main article p.text-price")
      .allTextContents();
    for (const price of prices) {
      expect(Number(price.replace(/\D/g, ""))).toBeLessThanOrEqual(12500);
    }
  });

  test("filters survive a reload from the URL", async ({ page }) => {
    await page.goto("/ankara?kira=15000&ozellik=balcony");

    await expect(
      page.getByRole("combobox", { name: "Kira (en fazla)" }),
    ).toContainText("15.000 TL");
  });

  test("sort changes the order and syncs to the URL", async ({ page }) => {
    await page.goto("/ankara");

    await page.getByRole("combobox", { name: "Sıralama" }).click();
    await page.getByRole("option", { name: "Kira (en düşük)" }).click();
    await expect(page).toHaveURL(/sira=price_asc/);

    await expect(async () => {
      const prices = (
        await page
          .locator("main article")
          .filter({ hasNotText: "Öne çıkan" })
          .locator("p.text-price")
          .allTextContents()
      ).map((price) => Number(price.replace(/\D/g, "")));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }).toPass();
  });

  test("the city input only accepts provinces from the list", async ({ page }) => {
    await page.goto("/ankara");
    const city = page.getByRole("combobox", { name: "Şehir" });

    await city.fill("Ankara'da oda");
    await expect(page.getByRole("option")).toHaveCount(0);
    await city.press("Enter");
    await city.blur();
    await expect(page).toHaveURL(/\/ankara$/);
    await expect(city).toHaveValue("Ankara");

    await city.fill("sanli");
    await page.getByRole("option", { name: "Şanlıurfa" }).click();
    await expect(page).toHaveURL(/\/sanliurfa$/);
  });

  test("a province with no listings shows the empty city state", async ({ page }) => {
    await page.goto("/bayburt");

    await expect(
      page.getByText("Bayburt için henüz ilan yok. İlk ilanı sen ver."),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("no matches shows the empty state", async ({ page }) => {
    await page.goto("/ankara?m2=150&kira=5000");

    await expect(page.getByText("Bu kriterlere uygun ilan yok.")).toBeVisible();
  });

  test("filtered pages are noindex with a clean canonical", async ({ page }) => {
    await page.goto("/ankara?kira=20000");

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/ankara$/,
    );
  });

  test("/ilanlar redirects to a city", async ({ page }) => {
    await page.goto("/ilanlar");
    await expect(page).toHaveURL(/\/ankara$/);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/ankara");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("listing detail page", () => {
  test("shows the listing and the approximate map circle", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}-${listing.slug}`);

    await expect(page.getByText(`İlan no: ${listing.public_number}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Maliyet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ev detayları" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Oda" })).toBeVisible();

    const map = page.getByTestId("listing-map");
    await map.scrollIntoViewIfNeeded();
    await expect(map.locator("path.leaflet-interactive")).toHaveCount(1);
    await expect(map.locator(".leaflet-marker-icon")).toHaveCount(0);
    await expect(map.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  });

  test("a URL without the slug redirects to the real one", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}`);
    await expect(page).toHaveURL(
      new RegExp(`/ilan/${listing.public_number}-${listing.slug}$`),
    );
  });

  test("the gallery opens a lightbox with keyboard navigation", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}-${listing.slug}`);

    await page.getByRole("button", { name: "Fotoğrafları tam ekran aç" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/^1 \/ \d+$/)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText(/^2 \/ \d+$/)).toBeVisible();
  });

  test("unknown listings return 404", async ({ request }) => {
    expect((await request.get("/ilan/99999999")).status()).toBe(404);
  });

  test("has no axe violations", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}-${listing.slug}`);
    await page.getByTestId("listing-map").scrollIntoViewIfNeeded();
    await expect(page.locator(".leaflet-container")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("privacy", () => {
  test("the page never exposes the door number or exact location", async ({
    page,
  }) => {
    const listing = await firstListing();
    const response = await page.goto(
      `/ilan/${listing.public_number}-${listing.slug}`,
    );
    const html = await response!.text();

    expect(html).not.toContain("building_no");
    expect(html).not.toContain(String(listing.lat));
    expect(html).not.toContain(String(listing.lng));
    expect(listing.public_lat).not.toBe(listing.lat);
  });

  test("the public point is 80 to 250 metres from the real one", async () => {
    const listing = await firstListing();
    const dLat = (listing.public_lat! - listing.lat!) * 111_320;
    const dLng =
      (listing.public_lng! - listing.lng!) *
      111_320 *
      Math.cos((listing.lat! * Math.PI) / 180);
    const meters = Math.hypot(dLat, dLng);

    expect(meters).toBeGreaterThan(75);
    expect(meters).toBeLessThan(255);
  });

  test("the anonymous API refuses private columns", async ({ request }) => {
    const headers = { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! };
    const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;

    for (const column of ["building_no", "lat", "lng"]) {
      const view = await request.get(
        `${base}/public_listings?select=${column}&limit=1`,
        { headers },
      );
      expect(view.status()).toBe(400);
    }

    const table = await request.get(`${base}/listings?select=building_no`, {
      headers,
    });
    expect(await table.json()).toEqual([]);
  });
});

test.describe("seo", () => {
  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/ankara");

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Sitemap:");
  });

  test("listing pages carry JSON-LD", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}-${listing.slug}`);

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(scripts.join()).toContain("BreadcrumbList");
    expect(scripts.join()).toContain("Accommodation");
  });
});

test.describe("homepage", () => {
  test("follows section 5.1", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Ev arkadaşı, kiralık oda ve stüdyo bul",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Hemen ara/ })).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Nasıl çalışır?" }),
    ).toBeVisible();
    await expect(
      page.getByText("Evi görmeden asla kapora gönderme."),
    ).toBeVisible();
  });

  test("searching from the homepage opens results", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await expect(page).toHaveURL(/\/ankara$/);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("at 360px width", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("results have no horizontal scroll", async ({ page }) => {
    await page.goto("/ankara");
    await expectNoHorizontalScroll(page);
  });

  test("detail has no horizontal scroll", async ({ page }) => {
    const listing = await firstListing();
    await page.goto(`/ilan/${listing.public_number}-${listing.slug}`);
    await expectNoHorizontalScroll(page);
  });

  test("homepage has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalScroll(page);
  });
});
