"use client";

import { Flag, Lock, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/Button";

const TIPS = [
  { icon: Lock, title: "depositTitle", text: "depositText" },
  { icon: MessageSquare, title: "chatTitle", text: "chatText" },
  { icon: UserRound, title: "personalTitle", text: "personalText" },
  { icon: Flag, title: "reportTitle", text: "reportText" },
] as const;

type SafetyTipsProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Required the first time someone sends a message (section 5.8). */
export function SafetyTips({ open, onConfirm, onClose }: SafetyTipsProps) {
  const t = useTranslations("safety");

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-modal bg-white p-6 shadow-float"
        >
          <Dialog.Title className="mb-4 flex items-center gap-2 text-h2 font-semibold">
            <ShieldCheck aria-hidden="true" size={24} />
            {t("modalTitle")}
          </Dialog.Title>
          <ul className="flex flex-col gap-4">
            {TIPS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{t(title)}</p>
                  <p>{t(text)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col items-center gap-3">
            <Button onClick={onConfirm} className="w-full">
              {t("confirm")}
            </Button>
            <Link href="/guvenlik" className="text-meta underline">
              {t("more")}
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
