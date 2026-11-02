"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";

type FavoriteButtonProps = {
  listingId: string;
  /** "icon" for cards, "full" for the secondary button in the contact card. */
  variant?: "icon" | "full";
};

export function FavoriteButton({ listingId, variant = "icon" }: FavoriteButtonProps) {
  const t = useTranslations("detail");
  const { favoriteIds, toggleFavorite } = useAuth();

  const favorited = favoriteIds.has(listingId);
  const label = favorited ? t("removeFavorite") : t("addFavorite");
  const icon = (
    <Heart
      aria-hidden="true"
      size={20}
      className={favorited ? "fill-black" : undefined}
    />
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        aria-pressed={favorited}
        onClick={() => toggleFavorite(listingId)}
        className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill bg-white px-3 text-meta font-medium shadow-card hover:bg-black/4"
      >
        {icon}
        {favorited ? t("removeFavorite") : t("addFavorite")}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      onClick={() => toggleFavorite(listingId)}
      className={clsx(
        "flex size-9 cursor-pointer items-center justify-center rounded-pill bg-white hover:bg-black/4",
      )}
    >
      {icon}
    </button>
  );
}
