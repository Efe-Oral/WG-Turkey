import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Sparkline, type SeriesPoint } from "./Charts";

type KpiCardProps = {
  label: string;
  value: string;
  /** Percent versus the previous period. Null when there is nothing to compare. */
  change?: number | null;
  series?: SeriesPoint[];
};

function Change({ change }: { change: number }) {
  const t = useTranslations("admin");
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;

  return (
    <p className="flex items-center gap-1 text-small text-black/60 tabular-nums">
      <Icon aria-hidden="true" size={12} />
      {Math.abs(change).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}%{" "}
      {t("vsPrevious")}
    </p>
  );
}

export function KpiCard({ label, value, change, series }: KpiCardProps) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-3">
      <p className="text-meta text-black/60">{label}</p>
      <p className="text-h1 font-semibold tabular-nums">{value}</p>
      {change !== null && change !== undefined ? <Change change={change} /> : null}
      {series ? <Sparkline data={series} label={label} /> : null}
    </Card>
  );
}
