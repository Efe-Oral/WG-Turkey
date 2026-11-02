"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveViewer, getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  display_name_mode: z.enum(["first_initial", "full", "first"]),
  gender: z.enum(["female", "male", "unspecified"]).nullable(),
  birth_year: z.number().int().min(1920).max(2015).nullable(),
  occupation_status: z.enum(["student", "employed", "other"]).nullable(),
  occupation_field: z.string().trim().max(40).nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfile(input: ProfileInput): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  const parsed = profileSchema.safeParse(input);
  if (!viewer || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", viewer.id);

  revalidatePath("/", "layout");

  return { ok: !error };
}

export async function updateAbout(about: string): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  const parsed = z.string().trim().max(2000).safeParse(about);
  if (!viewer || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ about: parsed.data || null })
    .eq("id", viewer.id);

  return { ok: !error };
}

export async function updateEmailNotifications(
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications: Boolean(enabled) })
    .eq("id", viewer.id);

  return { ok: !error };
}

export async function updateAvatar(path: string): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !path.startsWith(`${viewer.id}/`) || path.includes("..")) {
    return { ok: false };
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", viewer.id);

  revalidatePath("/", "layout");

  return { ok: !error };
}

async function removeFolder(bucket: string, prefix: string): Promise<void> {
  const storage = createAdminClient().storage.from(bucket);
  const { data: entries } = await storage.list(prefix, { limit: 1000 });

  const files: string[] = [];
  for (const entry of entries ?? []) {
    const path = `${prefix}/${entry.name}`;
    // Folders have no id in the storage listing.
    if (entry.id) files.push(path);
    else await removeFolder(bucket, path);
  }

  if (files.length > 0) await storage.remove(files);
}

/**
 * KVKK: removes the account and personal data. Listings and profile go through
 * cascades. Conversations stay for the other person, with the sender erased, and
 * events keep no link to the user.
 */
export async function deleteAccount(confirmation: string): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer || confirmation !== "SİL") return { ok: false };

  await Promise.all([
    removeFolder("listing-photos", viewer.id),
    removeFolder("avatars", viewer.id),
  ]);

  const { error } = await createAdminClient().auth.admin.deleteUser(viewer.id);
  if (error) return { ok: false };

  const supabase = await createClient();
  await supabase.auth.signOut();

  return { ok: true };
}
