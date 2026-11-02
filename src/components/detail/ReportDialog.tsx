"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Choice";
import { Modal } from "@/components/ui/Modal";
import { createReport, type ReportInput } from "@/lib/listings/engagement";

const REASONS = [
  "scam",
  "fake",
  "wrong_info",
  "discriminatory",
  "offensive",
  "already_rented",
  "other",
] as const;

type ReportDialogProps = {
  target: { listingId?: string; messageId?: string; userId?: string };
  /** Hides the visible text, for tight spaces like the sticky bar. */
  iconOnly?: boolean;
};

export function ReportDialog({ target, iconOnly = false }: ReportDialogProps) {
  const t = useTranslations("report");
  const common = useTranslations("common");
  const { requireAuth } = useAuth();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportInput["reason"]>();
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const submit = async () => {
    if (!reason) return;

    setState("sending");
    try {
      const { ok } = await createReport({
        listingId: target.listingId ?? null,
        messageId: target.messageId ?? null,
        userId: target.userId ?? null,
        reason,
        details,
      });
      setState(ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={iconOnly ? t("button") : undefined}
        onClick={() =>
          requireAuth(() => {
            setState("idle");
            setOpen(true);
          })
        }
        className="inline-flex cursor-pointer items-center gap-1 py-1 hover:underline"
      >
        <Flag aria-hidden="true" size={iconOnly ? 20 : 14} />
        {iconOnly ? null : t("button")}
      </button>
      <Modal
        title={t("title")}
        closeLabel={common("close")}
        open={open}
        onOpenChange={setOpen}
      >
        {state === "sent" ? (
          <p role="status">{t("sent")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-meta font-semibold">{t("reason")}</legend>
              {REASONS.map((item) => (
                <Radio
                  key={item}
                  name="report-reason"
                  label={t(`reasons.${item}`)}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
              ))}
            </fieldset>
            <label className="flex flex-col gap-1 text-meta font-semibold">
              {t("details")}
              <textarea
                rows={3}
                maxLength={2000}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className="rounded-input border border-black/20 p-3 text-body font-normal"
              />
            </label>
            {state === "failed" ? (
              <p role="alert" className="text-meta text-error">
                {t("failed")}
              </p>
            ) : null}
            <Button
              disabled={!reason || state === "sending"}
              onClick={() => void submit()}
            >
              {t("send")}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
