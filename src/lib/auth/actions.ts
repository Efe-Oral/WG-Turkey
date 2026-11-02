"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "./viewer";

const KVKK_TEXT_VERSION = "2026-11-taslak";

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  consent: z.literal(true),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  const parsed = onboardingSchema.safeParse(input);
  if (!viewer || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      kvkk_consent_at: new Date().toISOString(),
      kvkk_text_version: KVKK_TEXT_VERSION,
    })
    .eq("id", viewer.id);

  if (error) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true };
}
