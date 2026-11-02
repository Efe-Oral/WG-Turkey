"use client";

import { Toast as RadixToast } from "radix-ui";
import { useState, type ReactNode } from "react";

type ToastProps = {
  message: string;
  renderTrigger: (show: () => void) => ReactNode;
};

export function Toast({ message, renderTrigger }: ToastProps) {
  const [open, setOpen] = useState(false);

  return (
    <RadixToast.Provider duration={4000} swipeDirection="down">
      {renderTrigger(() => setOpen(true))}
      <RadixToast.Root
        open={open}
        onOpenChange={setOpen}
        className="rounded-card bg-graphite px-4 py-3 text-body text-white shadow-float"
      >
        <RadixToast.Description>{message}</RadixToast.Description>
      </RadixToast.Root>
      <RadixToast.Viewport className="fixed bottom-4 left-1/2 z-50 w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 outline-none" />
    </RadixToast.Provider>
  );
}
