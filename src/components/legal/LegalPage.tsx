import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** Section 5.9: every legal text is a marked draft until the owner supplies it. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const t = useTranslations("legal");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <p role="note" className="rounded-card border-2 border-error p-3 font-semibold">
        {t("draftNote")}
      </p>
      <h1 className="text-h1 font-semibold">{title}</h1>
      {children}
    </div>
  );
}
