import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginGate } from "@/components/auth/LoginGate";
import { ListingForm } from "@/components/form/ListingForm";
import { getViewer } from "@/lib/auth/viewer";
import { getProvinces } from "@/lib/geo";
import { EMPTY_FORM } from "@/lib/listings/schema";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("form");
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function PostListingPage() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("form")]);

  if (!viewer) return <LoginGate message={t("loginRequired")} />;

  const provinces = await getProvinces();

  return (
    <ListingForm
      ownerId={viewer.id}
      cities={provinces.map(({ id, name, slug }) => ({ id, name, slug }))}
      initialValues={EMPTY_FORM}
      initialPhotos={[]}
      listingId={null}
      isLive={false}
    />
  );
}
