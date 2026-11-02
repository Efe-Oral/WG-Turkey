import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminDb, env } from "./env";

export function testEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function createTestUser(
  email: string,
  profile?: { firstName: string; lastName: string },
): Promise<string> {
  const { data, error } = await adminDb.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;

  if (profile) {
    await adminDb
      .from("profiles")
      .update({
        first_name: profile.firstName,
        last_name: profile.lastName,
        kvkk_consent_at: new Date().toISOString(),
        kvkk_text_version: "test",
      })
      .eq("id", data.user.id);
  }

  return data.user.id;
}

/** Removes the user with everything they own, including uploaded files. */
export async function deleteTestUser(userId: string): Promise<void> {
  const { data: folders } = await adminDb.storage
    .from("listing-photos")
    .list(userId);

  for (const folder of folders ?? []) {
    const { data: files } = await adminDb.storage
      .from("listing-photos")
      .list(`${userId}/${folder.name}`);
    await adminDb.storage
      .from("listing-photos")
      .remove((files ?? []).map((file) => `${userId}/${folder.name}/${file.name}`));
  }

  await adminDb.auth.admin.deleteUser(userId);
}

async function currentOtp(email: string): Promise<string> {
  const { data, error } = await adminDb.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;

  return data.properties.email_otp;
}

/**
 * Drives the real modal and real code check. Only the request that would send
 * an email is stubbed, so tests never email made-up addresses.
 */
export async function loginWithModal(page: Page, email: string): Promise<void> {
  await page.route("**/auth/v1/otp*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }),
  );

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "E-posta" }).fill(email);
  await dialog.getByRole("button", { name: "Devam et" }).click();

  const code = dialog.getByRole("textbox", { name: "6 haneli" });
  await expect(code).toBeVisible();
  await code.fill(await currentOtp(email));
  await dialog.getByRole("button", { name: "Doğrula" }).click();
}

export async function openLogin(page: Page): Promise<void> {
  await page.getByRole("banner").getByRole("button", { name: "Hesabım" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Logs an existing, onboarded user in from the homepage. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/");
  await openLogin(page);
  await loginWithModal(page, email);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("banner").getByRole("button", { name: /Hesabım/ }),
  ).toHaveAttribute("aria-haspopup", "menu", { timeout: 15_000 });
}

/** A database client acting as this user, to prove what the API refuses. */
export async function clientAs(email: string) {
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  await client.auth.verifyOtp({
    email,
    token: await currentOtp(email),
    type: "email",
  });

  return client;
}
