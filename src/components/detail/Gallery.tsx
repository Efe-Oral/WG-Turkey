"use client";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useState, type KeyboardEvent } from "react";
import { track } from "@/lib/events/client";

type GalleryProps = {
  listingId: string;
  title: string;
  photos: { id: string; url: string }[];
};

export function Gallery({ listingId, title, photos }: GalleryProps) {
  const t = useTranslations("detail");
  const common = useTranslations("common");
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const current = photos[index];
  if (!current) return null;

  const move = (step: number) =>
    setIndex((value) => (value + step + photos.length) % photos.length);

  const onLightboxKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  };

  const arrowClasses =
    "absolute top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill bg-white shadow-float hover:bg-black/4";

  return (
    <div id="gallery" className="relative aspect-4/3 overflow-hidden rounded-card bg-black/4">
      <button
        type="button"
        aria-label={t("openGallery")}
        onClick={() => {
          setOpen(true);
          track({ name: "gallery_open", listingId });
        }}
        className="absolute inset-0 cursor-zoom-in"
      >
        <Image
          src={current.url}
          alt={t("photoAlt", { title, index: index + 1 })}
          fill
          priority
          quality={60}
          sizes="(min-width: 768px) 820px, 100vw"
          className="object-cover"
        />
      </button>

      {photos.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={t("previousPhoto")}
            onClick={() => move(-1)}
            className={`${arrowClasses} left-2`}
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <button
            type="button"
            aria-label={t("nextPhoto")}
            onClick={() => move(1)}
            className={`${arrowClasses} right-2`}
          >
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        </>
      ) : null}

      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-pill bg-white px-3 py-1 text-meta font-medium tabular-nums">
        <Images aria-hidden="true" size={14} />
        {t("photos", { count: photos.length })}
      </span>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black" />
          <Dialog.Content
            aria-describedby={undefined}
            onKeyDown={onLightboxKey}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <Dialog.Title className="sr-only">{t("galleryTitle")}</Dialog.Title>
            <div className="relative h-full w-full">
              <Image
                src={current.url}
                alt={t("photoAlt", { title, index: index + 1 })}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <Dialog.Close
              aria-label={common("close")}
              className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-pill bg-white"
            >
              <X aria-hidden="true" size={22} />
            </Dialog.Close>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={t("previousPhoto")}
                  onClick={() => move(-1)}
                  className={`${arrowClasses} left-3`}
                >
                  <ChevronLeft aria-hidden="true" size={22} />
                </button>
                <button
                  type="button"
                  aria-label={t("nextPhoto")}
                  onClick={() => move(1)}
                  className={`${arrowClasses} right-3`}
                >
                  <ChevronRight aria-hidden="true" size={22} />
                </button>
              </>
            ) : null}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-white px-3 py-1 text-meta tabular-nums">
              {index + 1} / {photos.length}
            </span>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
