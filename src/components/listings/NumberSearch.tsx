"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { findListingByNumber } from "@/lib/listings/actions";

export function NumberSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const path = await findListingByNumber(value);
          setNotFound(path === null);
          if (path) router.push(path);
        });
      }}
      className="flex flex-col gap-2"
    >
      <input
        aria-label={t("numberSearch")}
        inputMode="numeric"
        placeholder={t("numberPlaceholder")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full rounded-input border border-black/20 bg-white px-3 text-body placeholder:text-black/60"
      />
      <Button compact type="submit" variant="dark" disabled={isPending}>
        {t("numberButton")}
      </Button>
      {notFound ? (
        <p role="alert" className="text-meta text-error">
          {t("numberNotFound")}
        </p>
      ) : null}
    </form>
  );
}
