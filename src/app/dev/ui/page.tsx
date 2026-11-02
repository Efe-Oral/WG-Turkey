import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DevUiShowcase } from "./DevUiShowcase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("devUi");

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function DevUiPage() {
  // Read at request time, so a build cannot bake the page into the live site.
  await connection();

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && process.env.ENABLE_DEV_UI !== "true") {
    notFound();
  }

  return <DevUiShowcase />;
}
