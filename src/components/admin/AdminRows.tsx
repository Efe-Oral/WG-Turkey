"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  approveListing,
  handleReport,
  rejectListing,
  setAccountType,
  setListingBoost,
  setUserBanned,
} from "@/lib/admin/actions";
import type { AdminUser, ModerationItem, ReportItem } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";

const REJECT_REASONS = [
  "spam",
  "fake",
  "photos",
  "contact",
  "discriminatory",
  "other",
] as const;

function useAction() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    setBusy(true);
    setFailed(false);
    const { ok } = await action();
    setBusy(false);
    if (ok) router.refresh();
    else setFailed(true);
  };

  const error = failed ? (
    <p role="alert" className="text-meta text-error">
      {t("failed")}
    </p>
  ) : null;

  return { busy, run, error };
}

export function ModerationRow({ item }: { item: ModerationItem }) {
  const t = useTranslations("admin");
  const { busy, run, error } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const reasonText = reason
    ? `${t(`rejectReasons.${reason as (typeof REJECT_REASONS)[number]}`)}${details ? `: ${details}` : ""}`
    : "";

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.title || "-"}</p>
          <p className="text-meta text-black/60 tabular-nums">
            {item.ownerName} · {item.publicNumber} · {formatDate(item.createdAt)}
          </p>
        </div>
        <Link href={`/ilan/${item.publicNumber}`} className="text-meta underline">
          {t("modPreview")}
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {item.flags.length > 0 ? (
          item.flags.map((flag) => (
            <li
              key={flag}
              className="rounded-pill bg-cyan px-2 py-0.5 text-small font-medium"
            >
              {t(`flags.${flag as "low_rent"}`)}
            </li>
          ))
        ) : (
          <li className="rounded-pill bg-black/4 px-2 py-0.5 text-small">
            {item.isFirst ? t("firstListing") : t("noFlags")}
          </li>
        )}
      </ul>
      {rejecting ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-meta font-semibold">
            {t("rejectReason")}
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 rounded-input border border-black/20 bg-white px-3 text-body font-normal"
            >
              <option value="" />
              {REJECT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {t(`rejectReasons.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-meta font-semibold">
            {t("rejectDetails")}
            <textarea
              rows={2}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="rounded-input border border-black/20 p-2 text-body font-normal"
            />
          </label>
          <div>
            <Button
              compact
              variant="dark"
              disabled={busy || !reason}
              onClick={() => void run(() => rejectListing(item.id, reasonText))}
            >
              {t("rejectSend")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            compact
            disabled={busy}
            onClick={() => void run(() => approveListing(item.id))}
          >
            {t("approve")}
          </Button>
          <Button compact variant="secondary" onClick={() => setRejecting(true)}>
            {t("reject")}
          </Button>
        </div>
      )}
      {error}
    </Card>
  );
}

export function ReportRow({ report }: { report: ReportItem }) {
  const t = useTranslations("admin");
  const reasons = useTranslations("report");
  const { busy, run, error } = useAction();

  return (
    <Card className="flex flex-col gap-2 p-4">
      <p className="font-semibold">
        {reasons(`reasons.${report.reason as "scam"}`)}
        <span className="ml-2 text-meta font-normal text-black/60 tabular-nums">
          {formatDate(report.createdAt)}
        </span>
      </p>
      {report.details ? <p className="text-meta">{report.details}</p> : null}
      <p className="text-meta">
        <span className="font-semibold">{t("reportTarget")}: </span>
        {report.listingNumber ? (
          <Link href={`/ilan/${report.listingNumber}`} className="underline">
            {t("reportListing")}: {report.listingTitle}
          </Link>
        ) : report.messageId ? (
          <>
            {t("reportMessage")}: {report.messageBody}
          </>
        ) : (
          <>
            {t("reportUser")}: {report.userName}
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          compact
          variant="secondary"
          disabled={busy}
          onClick={() => void run(() => handleReport(report.id, "dismiss"))}
        >
          {t("dismiss")}
        </Button>
        {report.listingNumber ? (
          <Button
            compact
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => handleReport(report.id, "pause"))}
          >
            {t("pauseListing")}
          </Button>
        ) : null}
        <Button
          compact
          variant="dark"
          disabled={busy}
          onClick={() => void run(() => handleReport(report.id, "ban"))}
        >
          {t("banUser")}
        </Button>
      </div>
      {error}
    </Card>
  );
}

export function UserRow({ user }: { user: AdminUser }) {
  const t = useTranslations("admin");
  const { busy, run, error } = useAction();

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {user.name || "-"}
            {user.banned ? (
              <span className="ml-2 rounded-pill bg-graphite px-2 py-0.5 text-small font-medium text-white">
                {t("banned")}
              </span>
            ) : null}
          </p>
          <p className="truncate text-meta text-black/60">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-meta">
            {t("accountType")}
            <select
              value={user.accountType}
              disabled={busy}
              onChange={(event) =>
                void run(() =>
                  setAccountType(
                    user.id,
                    event.target.value as "private" | "business",
                  ),
                )
              }
              className="h-9 rounded-input border border-black/20 bg-white px-2"
            >
              <option value="private">{t("private")}</option>
              <option value="business">{t("business")}</option>
            </select>
          </label>
          <Button
            compact
            variant="dark"
            disabled={busy}
            onClick={() => void run(() => setUserBanned(user.id, !user.banned))}
          >
            {user.banned ? t("unban") : t("ban")}
          </Button>
        </div>
      </div>
      {user.listings.length > 0 ? (
        <div>
          <p className="text-meta font-semibold">{t("listingsOf")}</p>
          <ul className="divide-y divide-black/12">
            {user.listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-2 py-1 text-meta"
              >
                <Link
                  href={`/ilan/${listing.publicNumber}`}
                  className="min-w-0 truncate font-normal"
                >
                  {listing.publicNumber} · {listing.title}
                </Link>
                <Button
                  compact
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() => setListingBoost(listing.id, !listing.boosted))
                  }
                  className="h-8 px-3 text-meta"
                >
                  {listing.boosted ? t("unboost") : t("boost")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error}
    </Card>
  );
}
