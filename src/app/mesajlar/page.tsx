import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LoginGate } from "@/components/auth/LoginGate";
import { Pagination } from "@/components/listings/Pagination";
import { InboxFilter } from "@/components/messaging/InboxFilter";
import { InboxList } from "@/components/messaging/InboxList";
import { Card } from "@/components/ui/Card";
import { getViewer } from "@/lib/auth/viewer";
import {
  getInbox,
  INBOX_PAGE_SIZE,
  type InboxFilter as Filter,
} from "@/lib/messaging/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title"), robots: { index: false } };
}

export default async function InboxPage({ searchParams }: PageProps) {
  const [params, viewer, t] = await Promise.all([
    searchParams,
    getViewer(),
    getTranslations("inbox"),
  ]);

  if (!viewer) return <LoginGate message={t("loginRequired")} />;

  const filter: Filter =
    params.filtre === "unread" || params.filtre === "archived"
      ? params.filtre
      : "all";
  const page = Math.max(1, Number(params.sayfa) || 1);
  const { rows, total } = await getInbox(viewer, filter, page);

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    if (filter !== "all") query.set("filtre", filter);
    if (target > 1) query.set("sayfa", String(target));
    const text = query.toString();
    return text ? `/mesajlar?${text}` : "/mesajlar";
  };

  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
      <aside className="md:w-64 md:shrink-0">
        <Card className="p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden="true" size={18} />
            {t("safetyTitle")}
          </h2>
          <p className="text-meta">{t("safetyText")}</p>
          <Link href="/guvenlik" className="mt-1 inline-block text-meta underline">
            {t("safetyLink")}
          </Link>
        </Card>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h1 font-semibold">{t("title")}</h1>
          <InboxFilter value={filter} />
        </div>

        {rows.length > 0 ? (
          <InboxList rows={rows} archived={filter === "archived"} />
        ) : (
          <p className="py-8 text-center">{t("empty")}</p>
        )}

        <Pagination
          page={page}
          totalPages={Math.ceil(total / INBOX_PAGE_SIZE)}
          hrefFor={hrefFor}
        />
      </div>
    </div>
  );
}
