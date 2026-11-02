import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LoginGate } from "@/components/auth/LoginGate";
import { ComposeForm } from "@/components/messaging/ComposeForm";
import { ListingSummaryCard } from "@/components/messaging/ListingSummaryCard";
import { getViewer } from "@/lib/auth/viewer";
import { logEvent } from "@/lib/events/log";
import { getListing } from "@/lib/listings/detail";
import { getTemplates } from "@/lib/messaging/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compose");
  return { title: t("title"), robots: { index: false } };
}

export default async function ComposePage({ searchParams }: PageProps) {
  const [{ ilan }, viewer, t, card] = await Promise.all([
    searchParams,
    getViewer(),
    getTranslations("compose"),
    getTranslations("card"),
  ]);

  if (!viewer) return <LoginGate message={t("loginRequired")} />;

  const publicNumber = Number(ilan);
  const listing = Number.isInteger(publicNumber)
    ? await getListing(publicNumber)
    : null;
  if (!listing || listing.status !== "active") notFound();

  if (listing.owner_id === viewer.id) {
    return (
      <p className="mx-auto max-w-page px-4 py-12 text-center md:px-6">
        {t("ownListing")}
      </p>
    );
  }

  const templates = await getTemplates();

  await logEvent({
    name: "message_compose_open",
    userId: viewer.id,
    listingId: listing.id,
    provinceId: listing.province_id,
    districtId: listing.district_id,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <ListingSummaryCard
        listing={{
          publicNumber: listing.public_number,
          title: listing.title,
          slug: listing.slug,
          category: listing.category,
          householdSize: listing.household_size,
          sizeM2: listing.size_m2,
          total: listing.total_monthly,
        }}
        person={{
          name: listing.owner_name ?? card("anonymous"),
          avatarUrl: listing.owner_avatar_url,
          memberSince: listing.owner_member_since,
        }}
      />
      <ComposeForm
        publicNumber={listing.public_number}
        safetyAcknowledged={Boolean(viewer.profile.safety_ack_at)}
        templates={templates}
      />
    </div>
  );
}
