import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SECTION_TITLES = [
  "Renkler",
  "Yazı tipi",
  "Biçimlendirme",
  "Butonlar",
  "Metin alanları",
  "Açılır listeler",
  "Onay kutusu ve seçenekler",
  "Etiketler",
  "Kart",
  "Pencere ve bildirim",
  "Profil görselleri",
  "Boş durum",
];

// Next.js prefetches these header links, but their pages arrive in later
// phases. Remove each one as its page ships.
const UNBUILT_ROUTES = ["/ilanlar", "/guvenlik", "/ilan-ver"];

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("layout", () => {
  test("header and footer render in Turkish", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "İlanlar" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Güvenlik" })).toBeVisible();
    await expect(header.getByRole("link", { name: "İlan ver" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Hesabım" })).toBeVisible();

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "İstanbul" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Keçiören" })).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "KVKK Aydınlatma Metni" }),
    ).toBeVisible();
    await expect(footer.getByText("Şifremi unuttum")).toHaveCount(0);
  });

  test("the document language is Turkish", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  });

  test("unknown pages return 404 with a Turkish message", async ({ page }) => {
    const response = await page.goto("/bu-sayfa-yok/alt-sayfa");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Sayfa bulunamadı" }),
    ).toBeVisible();
  });

  test("security headers are set", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("/dev/ui", () => {
  test("shows every section with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().startsWith("Failed to load resource")
      ) {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (response.status() >= 400 && !UNBUILT_ROUTES.includes(path)) {
        errors.push(`${response.status()} ${path}`);
      }
    });

    await page.goto("/dev/ui");

    for (const title of SECTION_TITLES) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("renders Turkish characters and casing correctly", async ({ page }) => {
    await page.goto("/dev/ui");

    await expect(page.getByText("İĞÜŞÖÇ ığüşöç")).toBeVisible();
    await expect(page.getByText("KİRA, İLÇE, İLETİŞİM, ISINMA")).toBeVisible();
    await expect(page.getByText("12.500 TL / ay").first()).toBeVisible();
    await expect(page.getByText("01.12.2026")).toBeVisible();
  });

  test("uses Inter and tabular numbers", async ({ page }) => {
    await page.goto("/dev/ui");

    const fontFamily = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).fontFamily);
    expect(fontFamily).toContain("Inter");

    await expect(page.getByText("12.500 TL / ay").first()).toHaveCSS(
      "font-variant-numeric",
      "tabular-nums",
    );
  });

  test("the multi-select badge counts selections", async ({ page }) => {
    await page.goto("/dev/ui");

    const trigger = page.getByRole("button", { name: /^Kategori:/ });
    await expect(trigger).toContainText("2");

    await trigger.click();
    await page.getByRole("menuitemcheckbox", { name: "Stüdyo (1+0)" }).click();
    await expect(trigger).toContainText("3");
  });

  test("the single dropdown selects a value", async ({ page }) => {
    await page.goto("/dev/ui");

    const trigger = page.getByRole("combobox", { name: "Sigara" });
    await expect(trigger).toContainText("fark etmez");

    await trigger.click();
    await page.getByRole("option", { name: "Balkonda" }).click();
    await expect(trigger).toContainText("Balkonda");
  });

  test("the modal opens and closes", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Pencereyi aç" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Önemli güvenlik ipuçları",
    });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Kapat" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the toast appears", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Bildirim göster" }).click();
    await expect(
      page.getByText("Bu özellik yakında geliyor.", { exact: false }).first(),
    ).toBeVisible();
  });

  test("has no axe accessibility violations", async ({ page }) => {
    await page.goto("/dev/ui");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("at 360px width", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const path of ["/", "/dev/ui"]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    });
  }
});
