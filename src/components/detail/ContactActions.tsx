"use client";

import { Phone, Printer, Share2, StickyNote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { revealPhone, saveNote } from "@/lib/listings/engagement";
import { ReportDialog } from "./ReportDialog";
import { ShareLinks } from "./ShareLinks";

type ContactActionsProps = {
  listingId: string;
  publicNumber: number;
  initialNote: string | null;
  showPhoneButton: boolean;
};

export function useMessageAction(publicNumber: number) {
  const router = useRouter();
  const { requireAuth } = useAuth();

  return () =>
    requireAuth(() => router.push(`/mesaj/yeni?ilan=${publicNumber}`));
}

export function ContactActions({
  listingId,
  publicNumber,
  initialNote,
  showPhoneButton,
}: ContactActionsProps) {
  const t = useTranslations("detail");
  const common = useTranslations("common");
  const { requireAuth } = useAuth();
  const sendMessage = useMessageAction(publicNumber);

  const [noteOpen, setNoteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteStatus, setNoteStatus] = useState<string>();
  const [phone, setPhone] = useState<string>();
  const [url, setUrl] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setUrl(window.location.href));
    return () => clearTimeout(timer);
  }, []);

  const secondaryClasses =
    "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill bg-white px-3 text-meta font-medium shadow-card hover:bg-black/4";
  const linkClasses =
    "inline-flex cursor-pointer items-center gap-1 py-1 hover:underline";

  return (
    <>
      <div className="flex gap-2">
        <FavoriteButton listingId={listingId} variant="full" />
        <button
          type="button"
          onClick={() => requireAuth(() => setNoteOpen(true))}
          className={secondaryClasses}
        >
          <StickyNote aria-hidden="true" size={18} />
          {t("note")}
        </button>
      </div>

      <Button onClick={sendMessage}>{t("message")}</Button>

      {showPhoneButton ? (
        <Button
          variant="secondary"
          onClick={() =>
            requireAuth(() => {
              void revealPhone(listingId).then((result) =>
                setPhone(result.phone ?? t("phoneFailed")),
              );
            })
          }
        >
          <Phone aria-hidden="true" size={18} />
          {phone ?? t("showPhone")}
        </Button>
      ) : null}

      <div className="flex flex-wrap justify-center gap-x-4 text-meta print:hidden">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className={linkClasses}
        >
          <Share2 aria-hidden="true" size={14} />
          {t("share")}
        </button>
        <ReportDialog target={{ listingId }} />
        <button
          type="button"
          onClick={() => window.print()}
          className={linkClasses}
        >
          <Printer aria-hidden="true" size={14} />
          {t("print")}
        </button>
      </div>

      <Modal
        title={t("note")}
        closeLabel={common("close")}
        open={noteOpen}
        onOpenChange={setNoteOpen}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-meta font-semibold">
            {t("noteLabel")}
            <textarea
              rows={4}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-input border border-black/20 p-3 text-body font-normal"
            />
          </label>
          <p className="text-meta text-black/60">{t("noteHelp")}</p>
          <p role="status" className="text-meta">
            {noteStatus}
          </p>
          <Button
            onClick={() => {
              void saveNote(listingId, note).then(({ ok }) =>
                setNoteStatus(ok ? t("noteSaved") : t("noteFailed")),
              );
            }}
          >
            {t("noteSave")}
          </Button>
        </div>
      </Modal>

      <Modal
        title={t("shareTitle")}
        closeLabel={common("close")}
        open={shareOpen}
        onOpenChange={setShareOpen}
      >
        <ShareLinks url={url} />
      </Modal>
    </>
  );
}
