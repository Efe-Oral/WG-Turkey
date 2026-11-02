"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  closeLabel: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function Modal({
  title,
  closeLabel,
  trigger,
  open,
  onOpenChange,
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-modal bg-white p-6 shadow-float"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-h2 font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pill hover:bg-black/4"
            >
              <X aria-hidden="true" size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
