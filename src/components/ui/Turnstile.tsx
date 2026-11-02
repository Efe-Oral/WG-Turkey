"use client";

import { useEffect, useRef } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          size: "invisible";
          callback: (token: string) => void;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/** Invisible bot check. Renders nothing until a site key is configured. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey) return;
    let widgetId: string | undefined;
    let cancelled = false;

    void loadScript().then(() => {
      if (cancelled || !container.current) return;
      widgetId = window.turnstile?.render(container.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: onToken,
      });
    });

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, onToken]);

  return siteKey ? <div ref={container} /> : null;
}
