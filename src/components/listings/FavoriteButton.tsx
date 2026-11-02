"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

type FavoriteButtonProps = {
  listingId: string;
  className?: string;
};

export function FavoriteButton({ listingId, className }: FavoriteButtonProps) {
  const t = useTranslations("detail");

  return (
    <button
      type="button"
      aria-label={t("addFavorite")}
      data-listing-id={listingId}
      className={clsx(
        "flex size-9 cursor-pointer items-center justify-center rounded-pill bg-white hover:bg-black/4",
        className,
      )}
    >
      <Heart aria-hidden="true" size={20} />
    </button>
  );
}
