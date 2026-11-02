import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { renewFromToken } from "@/lib/listings/renew";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("renew");
  return { title: t("title"), robots: { index: false } };
}

export default async function RenewPage({ searchParams }: PageProps) {
  const [{ t: token }, t] = await Promise.all([
    searchParams,
    getTranslations("renew"),
  ]);

  const renewed = typeof token === "string" && (await renewFromToken(token));

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-h1 font-semibold">
        {renewed ? t("title") : t("failed")}
      </h1>
      {renewed ? <p>{t("text")}</p> : null}
      <Link href="/hesabim/ilanlarim" className="underline">
        {t("myListings")}
      </Link>
    </div>
  );
}
