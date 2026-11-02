"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./AuthProvider";

/** Shown in place of a page that needs an account. */
export function LoginGate({ message }: { message: string }) {
  const t = useTranslations("auth");
  const { requireAuth } = useAuth();

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  return (
    <div className="mx-auto flex max-w-page flex-col items-center gap-4 px-4 py-16 text-center md:px-6">
      <p>{message}</p>
      <Button onClick={() => requireAuth()}>{t("login")}</Button>
    </div>
  );
}
