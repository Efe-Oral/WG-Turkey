import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

/**
 * The root layout sends public pages only the text they use. Sections with
 * larger client screens wrap themselves in this to receive all of it.
 */
export function FullMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
