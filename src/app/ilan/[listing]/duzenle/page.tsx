import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LoginGate } from "@/components/auth/LoginGate";
import { ListingForm } from "@/components/form/ListingForm";
import { getViewer } from "@/lib/auth/viewer";
import { getProvinces } from "@/lib/geo";
import { getEditableListing } from "@/lib/listings/form-data";
import { parseListingParam } from "@/lib/listings/urls";

type PageProps = { params: Promise<{ listing: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("form");
  return { title: t("editTitle"), robots: { index: false } };
}

export default async function EditListingPage({ params }: PageProps) {
  const [{ listing: param }, viewer, t] = await Promise.all([
    params,
    getViewer(),
    getTranslations("form"),
  ]);

  if (!viewer) return <LoginGate message={t("loginRequired")} />;

  const publicNumber = parseListingParam(param);
  const listing = publicNumber
    ? await getEditableListing(publicNumber, viewer)
    : null;
  if (!listing) notFound();

  const provinces = await getProvinces();

  return (
    <ListingForm
      ownerId={viewer.id}
      cities={provinces.map(({ id, name, slug }) => ({ id, name, slug }))}
      initialValues={listing.values}
      initialPhotos={listing.photos}
      listingId={listing.id}
      isLive={listing.status !== "draft"}
    />
  );
}
