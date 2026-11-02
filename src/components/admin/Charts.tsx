"use client";

import { useTranslations } from "next-intl";
import { useId, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/format";

// One series per chart, so the title names it and no legend is needed. Cyan is
// too faint for a thin line on white, so lines use graphite.
const LINE_COLOR = "#484848";
const GRID_COLOR = "rgb(0 0 0 / 12%)";
const AXIS_TEXT = "rgb(0 0 0 / 60%)";

export type SeriesPoint = { date: string; value: number };

const subscribe = () => () => {};

/** Charts measure the DOM, so they render after hydration only. */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function Sparkline({ data, label }: { data: SeriesPoint[]; label: string }) {
  const mounted = useMounted();

  return (
    <div role="img" aria-label={label} className="h-8 w-full">
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.[0] || !label) return null;

  return (
    <div className="rounded-input bg-white px-3 py-2 text-meta shadow-float tabular-nums">
      <p className="text-black/60">{formatDate(label)}</p>
      <p className="font-semibold">{payload[0].value}</p>
    </div>
  );
}

export function MetricChart({
  title,
  data,
}: {
  title: string;
  data: SeriesPoint[];
}) {
  const t = useTranslations("admin");
  const mounted = useMounted();
  const headingId = useId();
  const hasData = data.some((point) => point.value > 0);

  return (
    <figure aria-labelledby={headingId} className="flex flex-col gap-2">
      <figcaption id={headingId} className="text-meta font-semibold">
        {title}
      </figcaption>
      {hasData ? (
        <div className="h-52 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                  tickFormatter={(value: string) => value.slice(8) + "." + value.slice(5, 7)}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  minTickGap={32}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "rgb(0 0 0 / 30%)" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: LINE_COLOR, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      ) : (
        <p className="py-8 text-center text-black/60">{t("empty")}</p>
      )}
    </figure>
  );
}
