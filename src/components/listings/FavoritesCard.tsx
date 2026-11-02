"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function FavoritesCard() {
  const t = useTranslations("search");
  const { favoriteIds } = useAuth();

  return (
    <>
      <h2 className="text-body font-semibold">
        {t("favorites")}{" "}
        <span className="font-normal text-black/60 tabular-nums">
          ({favoriteIds.size})
        </span>
      </h2>
      <Link href="/hesabim/favoriler" className="mt-1 inline-block text-meta">
        {t("favoritesLink")}
      </Link>
    </>
  );
}
