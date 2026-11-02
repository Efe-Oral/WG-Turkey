"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { photoUrl } from "@/lib/listings/urls";
import { MAX_PHOTOS } from "@/lib/listings/schema";
import { addPhoto, removePhoto, reorderPhotos } from "@/lib/listings/mutations";
import { createClient } from "@/lib/supabase/client";

const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.8;

export type UploadedPhoto = { id: string; path: string };

type PhotoUploaderProps = {
  ownerId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  /** Photos belong to a listing, so the draft must exist first. */
  ensureListing: () => Promise<string | null>;
  error?: string;
};

/** Drawing to a canvas also drops all EXIF data, including GPS. */
async function toResizedWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

export function PhotoUploader({
  ownerId,
  photos,
  onChange,
  ensureListing,
  error,
}: PhotoUploaderProps) {
  const t = useTranslations("form");
  const input = useRef<HTMLInputElement>(null);
  const listingIdRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [dragged, setDragged] = useState<number | null>(null);

  const persistOrder = async (next: UploadedPhoto[]) => {
    onChange(next);
    const listingId = await ensureListing();
    if (listingId) {
      await reorderPhotos(
        listingId,
        next.map((photo) => photo.id),
      );
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    void persistOrder(next);
  };

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;

    setMessage(undefined);
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) {
      setMessage(t("photoLimit", { max: MAX_PHOTOS }));
    }

    setUploading(true);
    const listingId = await ensureListing();
    listingIdRef.current = listingId;
    if (!listingId) {
      setUploading(false);
      setMessage(t("photoFailed"));
      return;
    }

    const supabase = createClient();
    let current = photos;

    for (const file of files.slice(0, room)) {
      try {
        const blob = await toResizedWebp(file);
        const path = `${ownerId}/${listingId}/${crypto.randomUUID()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, blob, { contentType: "image/webp" });
        if (uploadError) throw uploadError;

        const result = await addPhoto(listingId, path);
        if (!result.ok) throw new Error("Rejected.");

        current = [...current, result.photo];
        onChange(current);
      } catch {
        setMessage(t("photoFailed"));
      }
    }

    setUploading(false);
  };

  const onDelete = async (index: number) => {
    const photo = photos[index];
    const listingId = await ensureListing();
    if (!photo || !listingId) return;

    const { ok } = await removePhoto(listingId, photo.id);
    if (ok) onChange(photos.filter((item) => item.id !== photo.id));
  };

  const buttonClasses =
    "flex size-8 cursor-pointer items-center justify-center rounded-pill bg-white shadow-card hover:bg-black/4 disabled:cursor-not-allowed disabled:text-black/30";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-meta text-black/60">{t("photoGuide")}</p>
        <p className="shrink-0 pl-3 text-meta font-semibold tabular-nums">
          {t("photoCounter", { count: photos.length, max: MAX_PHOTOS })}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            draggable
            data-testid="photo-tile"
            onDragStart={() => setDragged(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragged !== null) move(dragged, index);
              setDragged(null);
            }}
            className="relative aspect-4/3 overflow-hidden rounded-card bg-black/4"
          >
            <Image
              src={photoUrl(photo.path)}
              alt={t("photoAlt", { index: index + 1 })}
              fill
              sizes="240px"
              className="object-cover"
            />
            {index === 0 ? (
              <span className="absolute top-1 left-1 rounded-pill bg-cyan px-2 py-0.5 text-small font-medium">
                {t("photoCover")}
              </span>
            ) : null}
            <div className="absolute right-1 bottom-1 flex gap-1">
              <button
                type="button"
                aria-label={t("photoLeft")}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className={buttonClasses}
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                aria-label={t("photoRight")}
                disabled={index === photos.length - 1}
                onClick={() => move(index, index + 1)}
                className={buttonClasses}
              >
                <ChevronRight aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                aria-label={t("photoDelete")}
                onClick={() => void onDelete(index)}
                className={buttonClasses}
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          </li>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <li>
            <button
              type="button"
              disabled={uploading}
              onClick={() => input.current?.click()}
              className="flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-black/60 text-meta hover:bg-black/4"
            >
              <ImagePlus aria-hidden="true" size={24} />
              {uploading ? t("photoUploading") : t("photoAdd")}
            </button>
          </li>
        ) : null}
      </ul>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-input"
        onChange={(event) => void onFiles(event)}
      />

      {message || error ? (
        <p role="alert" className="text-meta text-error">
          {message ?? error}
        </p>
      ) : null}
    </div>
  );
}
