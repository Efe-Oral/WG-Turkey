import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareLinks } from "@/components/detail/ShareLinks";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/site";
import { listingPath } from "@/lib/listings/urls";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("published");
  return { title: t("title"), robots: { index: false } };
}

export default async function PublishedPage({ searchParams }: PageProps) {
  const [{ ilan }, viewer, t] = await Promise.all([
    searchParams,
    getViewer(),
    getTranslations("published"),
  ]);

  const publicNumber = Number(ilan);
  if (!viewer || !Number.isInteger(publicNumber)) notFound();

  const { data: listing } = await createAdminClient()
    .from("listings")
    .select("public_number, slug, status")
    .eq("public_number", publicNumber)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!listing) notFound();

  const path = listingPath(listing);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-12 text-center">
      <CheckCircle2 aria-hidden="true" size={40} className="text-valid" />
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>{listing.status === "active" ? t("activeText") : t("pendingText")}</p>
      <Link href={path}>{t("viewListing")}</Link>
      <div>
        <h2 className="mb-2 font-semibold">{t("share")}</h2>
        <ShareLinks url={absoluteUrl(path)} />
      </div>
      <Link href="/hesabim/ilanlarim">{t("myListings")}</Link>
    </div>
  );
}
