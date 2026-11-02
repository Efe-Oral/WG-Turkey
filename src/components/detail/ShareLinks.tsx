"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/events/client";

export function ShareLinks({ url }: { url: string }) {
  const t = useTranslations("detail");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        compact
        variant="secondary"
        onClick={() => {
          track({ name: "share_click", props: { channel: "copy" } });
          void navigator.clipboard.writeText(url).then(() => setCopied(true));
        }}
      >
        <Copy aria-hidden="true" size={16} />
        {copied ? t("linkCopied") : t("copyLink")}
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener"
        onClick={() => track({ name: "share_click", props: { channel: "whatsapp" } })}
        className="inline-flex h-10 items-center gap-2 rounded-pill bg-white px-6 font-medium shadow-card hover:no-underline"
      >
        <MessageCircle aria-hidden="true" size={16} />
        {t("whatsapp")}
      </a>
    </div>
  );
}
