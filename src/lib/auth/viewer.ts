import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ViewerProfile = {
  first_name: string | null;
  last_name: string | null;
  display_name_mode: "first_initial" | "full" | "first";
  gender: "female" | "male" | "unspecified" | null;
  birth_year: number | null;
  occupation_status: "student" | "employed" | "other" | null;
  occupation_field: string | null;
  about: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  account_type: "private" | "business";
  role: "user" | "admin";
  safety_ack_at: string | null;
  kvkk_consent_at: string | null;
  email_notifications: boolean;
  banned_at: string | null;
  created_at: string;
};

export type Viewer = {
  id: string;
  email: string | null;
  profile: ViewerProfile;
};

/** The logged-in user, or null. Skips the network when no session cookie exists. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const cookieStore = await cookies();
  const hasSession = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSession) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { id: user.id, email: user.email ?? null, profile };
});

/** For server actions: the viewer, unless they are logged out or banned. */
export async function getActiveViewer(): Promise<Viewer | null> {
  const viewer = await getViewer();
  return viewer && !viewer.profile.banned_at ? viewer : null;
}

export function isOnboarded(viewer: Viewer): boolean {
  return Boolean(viewer.profile.first_name && viewer.profile.kvkk_consent_at);
}
