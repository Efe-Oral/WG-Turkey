import { createClient } from "@supabase/supabase-js";

const DAY_IN_SECONDS = 86_400;

/**
 * Anonymous client for public pages. It holds no session, so it can only see
 * what the public views and Row Level Security allow.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Same client, cached for a day. Only for data that rarely changes. */
export function createCachedPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, next: { revalidate: DAY_IN_SECONDS } }),
      },
    },
  );
}
