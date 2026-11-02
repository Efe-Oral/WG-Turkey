"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { Button } from "@/components/ui/Button";
import { useMessageAction } from "./ContactActions";
import { ReportDialog } from "./ReportDialog";

type StickyContactBarProps = {
  listingId: string;
  publicNumber: number;
  ownerName: string;
  ownerType: string;
};

/** Section 5.3: appears once the gallery has scrolled out of view. */
export function StickyContactBar({
  listingId,
  publicNumber,
  ownerName,
  ownerType,
}: StickyContactBarProps) {
  const t = useTranslations("detail");
  const sendMessage = useMessageAction(publicNumber);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      }
    });
    observer.observe(gallery);

    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <section
      aria-label={t("stickyLabel")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/12 bg-white shadow-float print:hidden"
    >
      <div className="mx-auto flex max-w-page items-center justify-between gap-3 px-4 py-2 md:px-6">
        <p className="hidden min-w-0 sm:block">
          <span className="block truncate font-semibold">{ownerName}</span>
          <span className="block text-meta text-black/60">{ownerType}</span>
        </p>
        <Button compact onClick={sendMessage}>
          {t("message")}
        </Button>
        <div className="flex items-center gap-2">
          <FavoriteButton listingId={listingId} />
          <ReportDialog target={{ listingId }} iconOnly />
        </div>
      </div>
    </section>
  );
}
