import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { MetricChart, type SeriesPoint } from "@/components/admin/Charts";
import { DataTable } from "@/components/admin/DataTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { MetricsFilters } from "@/components/admin/MetricsFilters";
import { Card } from "@/components/ui/Card";
import {
  getDailySeries,
  getMetricsTables,
  previousRange,
  type DailyPoint,
  type DateRange,
} from "@/lib/admin/queries";
import { getProvinces } from "@/lib/geo";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DAY_MS = 86_400_000;
const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

function isoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function resolveRange(params: Awaited<PageProps["searchParams"]>): {
  key: string;
  range: DateRange;
} {
  const key = String(params.aralik ?? "30");
  const today = Date.now();

  if (
    key === "ozel" &&
    typeof params.bas === "string" &&
    typeof params.bit === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.bas) &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.bit) &&
    params.bas <= params.bit
  ) {
    return { key, range: { from: params.bas, to: params.bit } };
  }

  const days = key === "7" || key === "90" ? Number(key) : 30;

  return {
    key: String(days),
    range: { from: isoDate(today - (days - 1) * DAY_MS), to: isoDate(today) },
  };
}

const sum = (series: DailyPoint[], key: string) =>
  series.reduce((total, point) => total + (point.values[key] ?? 0), 0);

/** Snapshot metrics read the newest day that has a value. */
const latest = (series: DailyPoint[], key: string) =>
  [...series].reverse().find((point) => point.values[key] !== undefined)?.values[key] ?? 0;

const toSeries = (series: DailyPoint[], key: string): SeriesPoint[] =>
  series.map((point) => ({ date: point.date, value: point.values[key] ?? 0 }));

const percent = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0;

function changeBetween(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

const show = (value: number | null | undefined) =>
  value === null || value === undefined ? "-" : number.format(value);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}

export default async function MetricsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { key, range } = resolveRange(params);
  const compare = params.karsilastir === "1";

  const provinces = await getProvinces();
  const province =
    provinces.find((item) => item.id === params.il)?.id ?? null;

  const [t, enums, myListings, series, tables, previousSeries] = await Promise.all([
    getTranslations("admin"),
    getTranslations("enums"),
    getTranslations("myListings"),
    getDailySeries(range, province),
    getMetricsTables(range, province),
    compare ? getDailySeries(previousRange(range), province) : Promise.resolve(null),
  ]);

  const days = series.length;
  const weeks = Math.max(1, days / 7);

  const summed = (metric: string, divisor = 1) => ({
    value: sum(series, metric) / divisor,
    change: changeBetween(
      sum(series, metric),
      previousSeries ? sum(previousSeries, metric) : null,
    ),
    series: toSeries(series, metric),
  });

  const lastActive = latest(series, "active_listings");
  const sessions = sum(series, "sessions");
  const searches = sum(series, "searches");

  const zeroRate = percent(sum(series, "zero_searches"), searches);
  const filterRate = percent(sum(series, "filter_sessions"), sessions);
  const photoRate = percent(latest(series, "listings_3plus_photos"), lastActive);
  const averageAge = lastActive > 0 ? latest(series, "listing_age_sum") / lastActive : 0;

  const previousRatio = (part: string, whole: string) =>
    previousSeries
      ? percent(sum(previousSeries, part), sum(previousSeries, whole))
      : null;

  const rentedWeekly = summed("rented_platform", weeks);
  const rentedTotal = summed("rented_total");
  const newListings = summed("new_listings", weeks);
  const sessionKpi = summed("sessions");
  const searchKpi = summed("searches");
  const favoriteKpi = summed("favorites");
  const signupKpi = summed("signups");
  const boostKpi = summed("boost_clicks");

  const flagLabel = (flag: string) => t(`flags.${flag as "low_rent"}`);
  const reasonLabel = (reason: string) =>
    myListings(`reasons.${reason as "other"}`);

  const funnelRows = (
    ["visits", "listing_views", "messages", "replies", "rented"] as const
  ).map((step) => ({ step: t(`funnelSteps.${step}`), count: tables.funnel[step] }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1 font-semibold">{t("metrics")}</h1>
        <MetricsFilters
          range={key}
          from={range.from}
          to={range.to}
          province={province ?? ""}
          compare={compare}
          provinces={provinces.map(({ id, name }) => ({ id, name }))}
        />
      </div>

      <Section title={t("sectionNorth")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.rentedWeekly")}
            value={show(rentedWeekly.value)}
            change={rentedWeekly.change}
            series={rentedWeekly.series}
          />
          <KpiCard
            label={t("kpi.rentedTotal")}
            value={show(rentedTotal.value)}
            change={rentedTotal.change}
            series={rentedTotal.series}
          />
        </KpiGrid>
        <Card className="p-4">
          <MetricChart title={t("kpi.rentedTotal")} data={rentedTotal.series} />
        </Card>
      </Section>

      <Section title={t("sectionSupply")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.newListingsWeekly")}
            value={show(newListings.value)}
            change={newListings.change}
            series={newListings.series}
          />
          <KpiCard
            label={t("kpi.activeListings")}
            value={show(lastActive)}
            series={toSeries(series, "active_listings")}
          />
          <KpiCard label={t("kpi.avgAge")} value={show(averageAge)} />
          <KpiCard label={t("kpi.photoRate")} value={`${show(photoRate)}%`} />
          <KpiCard
            label={t("kpi.repeatRate")}
            value={`${show(tables.repeat_lister_rate)}%`}
          />
          <KpiCard label={t("kpi.pending")} value={show(tables.pending_review)} />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-2">
          <MetricChart title={t("kpi.activeListings")} data={toSeries(series, "active_listings")} />
          <DataTable
            title={t("table.topDistricts")}
            fileName="ilce-aktif-ilan"
            columns={[
              { key: "district", label: t("table.district") },
              { key: "listings", label: t("table.listings"), numeric: true },
            ]}
            rows={tables.top_districts}
          />
        </Card>
      </Section>

      <Section title={t("sectionDemand")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.sessions")}
            value={show(sessionKpi.value)}
            change={sessionKpi.change}
            series={sessionKpi.series}
          />
          <KpiCard
            label={t("kpi.searches")}
            value={show(searchKpi.value)}
            change={searchKpi.change}
            series={searchKpi.series}
          />
          <KpiCard
            label={t("kpi.zeroRate")}
            value={`${show(zeroRate)}%`}
            change={changeBetween(zeroRate, previousRatio("zero_searches", "searches"))}
          />
          <KpiCard
            label={t("kpi.filterRate")}
            value={`${show(filterRate)}%`}
            change={changeBetween(filterRate, previousRatio("filter_sessions", "sessions"))}
          />
          <KpiCard
            label={t("kpi.favorites")}
            value={show(favoriteKpi.value)}
            change={favoriteKpi.change}
            series={favoriteKpi.series}
          />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-2">
          <MetricChart title={t("kpi.searches")} data={searchKpi.series} />
          <DataTable
            title={t("table.zeroResults")}
            fileName="sonucsuz-aramalar"
            columns={[
              { key: "province", label: t("table.province") },
              { key: "district", label: t("table.district") },
              { key: "category", label: t("table.category") },
              { key: "max_rent", label: t("table.maxRent") },
              { key: "searches", label: t("table.searches"), numeric: true },
            ]}
            rows={tables.zero_results}
          />
        </Card>
      </Section>

      <Section title={t("sectionMatch")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.messagesMean")}
            value={show(tables.messages_per_listing_mean)}
          />
          <KpiCard
            label={t("kpi.messagesMedian")}
            value={show(tables.messages_per_listing_median)}
          />
          <KpiCard label={t("kpi.firstReply")} value={show(tables.first_reply_minutes_median)} />
          <KpiCard label={t("kpi.replyRate")} value={`${show(tables.reply_rate_72h)}%`} />
          <KpiCard label={t("kpi.rented14")} value={`${show(tables.rented_within_14d_rate)}%`} />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-2">
          <MetricChart title={t("metrics")} data={toSeries(series, "messages")} />
          <DataTable
            title={t("table.deleteReasons")}
            fileName="silme-sebepleri"
            columns={[
              { key: "reason", label: t("table.reason") },
              { key: "listings", label: t("table.listings"), numeric: true },
            ]}
            rows={tables.delete_reasons.map((row) => ({
              ...row,
              reason: reasonLabel(row.reason),
            }))}
          />
        </Card>
      </Section>

      <Section title={t("sectionTrust")}>
        <KpiGrid>
          <KpiCard label={t("kpi.reportsPer100")} value={show(tables.reports_per_100)} />
          <KpiCard label={t("kpi.rejectRate")} value={`${show(tables.reject_rate)}%`} />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-2">
          <MetricChart title={t("reports")} data={toSeries(series, "reports")} />
          <DataTable
            title={t("table.flags")}
            fileName="otomatik-isaretler"
            columns={[
              { key: "flag", label: t("table.flag") },
              { key: "listings", label: t("table.listings"), numeric: true },
            ]}
            rows={tables.flags.map((row) => ({ ...row, flag: flagLabel(row.flag) }))}
          />
        </Card>
      </Section>

      <Section title={t("sectionGrowth")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.signups")}
            value={show(signupKpi.value)}
            change={signupKpi.change}
            series={signupKpi.series}
          />
          <KpiCard label={t("kpi.retention7")} value={`${show(tables.retention_7d)}%`} />
          <KpiCard label={t("kpi.retention30")} value={`${show(tables.retention_30d)}%`} />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-3">
          <MetricChart title={t("kpi.signups")} data={signupKpi.series} />
          <DataTable
            title={t("table.sources")}
            fileName="kaynaklar"
            columns={[
              { key: "source", label: t("table.source") },
              { key: "sessions", label: t("table.sessions"), numeric: true },
            ]}
            rows={tables.sources}
          />
          <DataTable
            title={t("table.funnel")}
            fileName="donusum-hunisi"
            columns={[
              { key: "step", label: t("table.step") },
              { key: "count", label: t("table.count"), numeric: true },
            ]}
            rows={funnelRows}
          />
        </Card>
      </Section>

      <Section title={t("sectionMoney")}>
        <KpiGrid>
          <KpiCard
            label={t("kpi.boostClicks")}
            value={show(boostKpi.value)}
            change={boostKpi.change}
            series={boostKpi.series}
          />
          <KpiCard label={t("kpi.boostListers")} value={show(tables.boost_unique_listers)} />
        </KpiGrid>
        <Card className="grid gap-6 p-4 md:grid-cols-2">
          <MetricChart title={t("kpi.boostClicks")} data={boostKpi.series} />
          <DataTable
            title={t("table.possibleBusiness")}
            fileName="olasi-isletmeler"
            columns={[
              { key: "user_name", label: t("table.user") },
              { key: "listings", label: t("table.listings"), numeric: true },
            ]}
            rows={tables.possible_business}
          />
          <DataTable
            title={t("table.supplyDemand")}
            fileName="arz-talep"
            columns={[
              { key: "district", label: t("table.district") },
              { key: "active_listings", label: t("table.activeListings"), numeric: true },
              { key: "searches", label: t("table.searches"), numeric: true },
              {
                key: "searches_per_listing",
                label: t("table.searchesPerListing"),
                numeric: true,
              },
            ]}
            rows={tables.supply_demand}
          />
          <DataTable
            title={t("table.medianRents")}
            fileName="medyan-kira"
            columns={[
              { key: "district", label: t("table.district") },
              { key: "category", label: t("table.category") },
              { key: "listings", label: t("table.listings"), numeric: true },
              { key: "median_rent", label: t("table.medianRent"), numeric: true },
            ]}
            rows={tables.median_rents.map((row) => ({
              ...row,
              category: enums(`category.${row.category as "room"}`),
            }))}
          />
        </Card>
      </Section>
    </div>
  );
}
