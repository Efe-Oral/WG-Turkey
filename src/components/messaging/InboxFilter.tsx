"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";

export function InboxFilter({ value }: { value: string }) {
  const t = useTranslations("inbox");
  const router = useRouter();

  return (
    <Dropdown
      label={t("filter")}
      placeholder={t("filterAll")}
      value={value}
      className="sm:w-56"
      onValueChange={(next) =>
        router.push(next === "all" ? "/mesajlar" : `/mesajlar?filtre=${next}`)
      }
      options={[
        { value: "all", label: t("filterAll") },
        { value: "unread", label: t("filterUnread") },
        { value: "archived", label: t("filterArchived") },
      ]}
    />
  );
}
