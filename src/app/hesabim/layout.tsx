import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { LoginGate } from "@/components/auth/LoginGate";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { robots: { index: false } };

export default async function Layout({ children }: { children: ReactNode }) {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("account")]);

  if (!viewer) return <LoginGate message={t("loginRequired")} />;

  return <AccountLayout>{children}</AccountLayout>;
}
