import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function readEnv(): Record<string, string> {
  const entries = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)] as const;
    });

  return Object.fromEntries(entries);
}

export const env = readEnv();

/** Service-role client, for arranging and checking test data. */
export const adminDb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
