import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTestUser, deleteTestUser, login, testEmail } from "../helpers/auth";
import { adminDb } from "../helpers/env";

const MESSAGE = "Merhaba, odanız hâlâ müsait mi? Görmeye gelmek isterim.";

type Pair = {
  listerEmail: string;
  seekerEmail: string;
  listerId: string;
  seekerId: string;
  publicNumber: number;
  listingId: string;
};

/** A lister with one active listing, and a seeker who never sent a message. */
async function createPair(label: string): Promise<Pair> {
  const listerEmail = testEmail(`${label}-lister`);
  const seekerEmail = testEmail(`${label}-seeker`);
  const listerId = await createTestUser(listerEmail, {
    firstName: "Selin",
    lastName: "Lister",
  });
  const seekerId = await createTestUser(seekerEmail, {
    firstName: "Burak",
    lastName: "Seeker",
  });

  const { data: template } = await adminDb
    .from("listings")
    .select("province_id, district_id")
    .eq("status", "active")
    .limit(1)
    .single();

  const { data: listing } = await adminDb
    .from("listings")
    .insert({
      owner_id: listerId,
      status: "active",
      title: `Mesaj testi ${label}`,
      slug: "mesaj-testi",
      province_id: template!.province_id,
      district_id: template!.district_id,
      rent: 10000,
      published_at: new Date().toISOString(),
    })
    .select("id, public_number")
    .single();

  return {
    listerEmail,
    seekerEmail,
    listerId,
    seekerId,
    publicNumber: listing!.public_number,
    listingId: listing!.id,
  };
}

async function cleanup(pair: Pair) {
  await deleteTestUser(pair.seekerId);
  await deleteTestUser(pair.listerId);
}

async function newLoggedInPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return page;
}

async function sendFirstMessage(page: Page, pair: Pair, body = MESSAGE) {
  await page.goto(`/mesaj/yeni?ilan=${pair.publicNumber}`);
  await page.getByRole("textbox", { name: "Mesajın:" }).fill(body);
  await page.getByRole("button", { name: "Gönder" }).click();

  const safety = page.getByRole("dialog", { name: "Önemli güvenlik ipuçları" });
  await safety.getByRole("button", { name: "Güvenlik ipuçlarını okudum" }).click();
  await expect(page).toHaveURL(/\/mesajlar\/[0-9a-f-]{36}$/, { timeout: 20_000 });
}

test.describe("messaging", () => {
  test.setTimeout(90_000);

  test("two users exchange messages and the badge updates live", async ({
    browser,
  }) => {
    const pair = await createPair("sohbet");

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);
      const lister = await newLoggedInPage(browser, pair.listerEmail);

      // The lister waits on another page: the badge must appear on its own.
      await lister.goto("/ankara");
      await lister.waitForTimeout(1500);
      await expect(lister.getByTestId("unread-badge")).toHaveCount(0);

      await sendFirstMessage(seeker, pair);
      await expect(seeker.getByText(MESSAGE)).toBeVisible();

      await expect(lister.getByTestId("unread-badge")).toHaveText("1", {
        timeout: 15_000,
      });

      await lister.goto("/mesajlar");
      const row = lister.getByRole("link", { name: /Burak S\./ });
      await expect(row).toBeVisible();
      await row.click();
      await expect(lister.getByText(MESSAGE)).toBeVisible();

      await expect(lister.getByTestId("unread-badge")).toHaveCount(0, {
        timeout: 15_000,
      });

      const reply = "Evet müsait, cumartesi gelebilirsin.";
      await lister.getByRole("textbox", { name: "Yanıtın" }).fill(reply);
      await lister.getByRole("button", { name: "Gönder" }).click();
      await expect(lister.getByText(reply)).toBeVisible();

      // The open thread updates with no reload.
      await expect(seeker.getByText(reply)).toBeVisible({ timeout: 15_000 });

      const { data: conversation } = await adminDb
        .from("conversations")
        .select("first_reply_at")
        .eq("listing_id", pair.listingId)
        .single();
      expect(conversation?.first_reply_at).not.toBeNull();
    } finally {
      await cleanup(pair);
    }
  });

  test("the safety modal appears only once", async ({ browser }) => {
    const pair = await createPair("guvenlik");

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);
      await sendFirstMessage(seeker, pair);

      const { data } = await adminDb
        .from("profiles")
        .select("safety_ack_at")
        .eq("id", pair.seekerId)
        .single();
      expect(data?.safety_ack_at).not.toBeNull();

      await seeker.waitForTimeout(5500);
      await seeker.goto(`/mesaj/yeni?ilan=${pair.publicNumber}`);
      await seeker.getByRole("textbox", { name: "Mesajın:" }).fill(`${MESSAGE} Tekrar.`);
      await seeker.getByRole("button", { name: "Gönder" }).click();

      await expect(seeker).toHaveURL(/\/mesajlar\/[0-9a-f-]{36}$/, {
        timeout: 20_000,
      });
      await expect(seeker.getByRole("dialog")).toHaveCount(0);
    } finally {
      await cleanup(pair);
    }
  });

  test("short messages and rapid sending are refused", async ({ browser }) => {
    const pair = await createPair("sinir");

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);

      await seeker.goto(`/mesaj/yeni?ilan=${pair.publicNumber}`);
      await seeker.getByRole("textbox", { name: "Mesajın:" }).fill("Merhaba");
      await seeker.getByRole("button", { name: "Gönder" }).click();
      await expect(seeker.getByText("en az 20 karakter")).toBeVisible();

      await sendFirstMessage(seeker, pair);
      await seeker.getByRole("textbox", { name: "Yanıtın" }).fill("Bir şey daha");
      await seeker.getByRole("button", { name: "Gönder" }).click();
      await expect(seeker.getByText("Birkaç saniye sonra")).toBeVisible();
    } finally {
      await cleanup(pair);
    }
  });

  test("scam words show a warning above the message", async ({ browser }) => {
    const pair = await createPair("dolandirici");

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);
      await sendFirstMessage(
        seeker,
        pair,
        "Lütfen önce kapora gönder, IBAN numaram burada yazıyor.",
      );

      await expect(seeker.getByText("Evi görmeden ödeme yapma.")).toBeVisible();
    } finally {
      await cleanup(pair);
    }
  });

  test("outsiders cannot read a conversation", async ({ browser }) => {
    const pair = await createPair("gizli");
    const outsiderEmail = testEmail("disari");
    const outsiderId = await createTestUser(outsiderEmail, {
      firstName: "Cem",
      lastName: "Outsider",
    });

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);
      await sendFirstMessage(seeker, pair);
      const threadUrl = seeker.url();

      const outsider = await newLoggedInPage(browser, outsiderEmail);
      const response = await outsider.goto(threadUrl);
      expect(response?.status()).toBe(404);
      await expect(outsider.getByText(MESSAGE)).toHaveCount(0);
    } finally {
      await deleteTestUser(outsiderId);
      await cleanup(pair);
    }
  });

  test("marking rented from a thread records the match", async ({ browser }) => {
    const pair = await createPair("kiralandi");

    try {
      const seeker = await newLoggedInPage(browser, pair.seekerEmail);
      await sendFirstMessage(seeker, pair);
      const threadUrl = seeker.url();

      const lister = await newLoggedInPage(browser, pair.listerEmail);
      await lister.goto(threadUrl);
      await lister.getByRole("button", { name: "Kiralandı" }).click();

      await expect(lister.getByRole("button", { name: "Kiralandı" })).toHaveCount(0, {
        timeout: 15_000,
      });

      const { data } = await adminDb
        .from("listings")
        .select("status, rented_via_platform, rented_conversation_id")
        .eq("id", pair.listingId)
        .single();
      expect(data?.status).toBe("rented");
      expect(data?.rented_via_platform).toBe("yes");
      expect(data?.rented_conversation_id).toBe(threadUrl.split("/").pop());
    } finally {
      await cleanup(pair);
    }
  });

  test("the message button asks a visitor to log in", async ({ page }) => {
    await page.goto("/ankara");
    await page.locator("main article h2 a").first().click();
    await page.getByRole("button", { name: "Mesaj gönder" }).first().click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Hoş geldin")).toBeVisible();
  });
});
