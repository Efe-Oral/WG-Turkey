"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";

type MetricsFiltersProps = {
  range: string;
  from: string;
  to: string;
  province: string;
  compare: boolean;
  provinces: { id: string; name: string }[];
};

const selectClasses =
  "h-10 rounded-input border border-black/20 bg-white px-3 text-body";

export function MetricsFilters({
  range: initialRange,
  from: initialFrom,
  to: initialTo,
  province: initialProvince,
  compare: initialCompare,
  provinces,
}: MetricsFiltersProps) {
  const t = useTranslations("admin");
  const router = useRouter();

  const [range, setRange] = useState(initialRange);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [province, setProvince] = useState(initialProvince);
  const [compare, setCompare] = useState(initialCompare);

  const apply = () => {
    const query = new URLSearchParams({ aralik: range });
    if (range === "ozel") {
      query.set("bas", from);
      query.set("bit", to);
    }
    if (province) query.set("il", province);
    if (compare) query.set("karsilastir", "1");
    router.push(`/admin/metrics?${query.toString()}`);
  };

  const ankara = provinces.find((item) => item.name === "Ankara");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card bg-black/4 p-3">
      <label className="flex flex-col gap-1 text-small font-semibold">
        {t("rangeLabel")}
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className={`${selectClasses} font-normal`}
        >
          <option value="7">{t("range7")}</option>
          <option value="30">{t("range30")}</option>
          <option value="90">{t("range90")}</option>
          <option value="ozel">{t("rangeCustom")}</option>
        </select>
      </label>
      {range === "ozel" ? (
        <>
          <label className="flex flex-col gap-1 text-small font-semibold">
            {t("from")}
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={`${selectClasses} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-small font-semibold">
            {t("to")}
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={`${selectClasses} font-normal`}
            />
          </label>
        </>
      ) : null}
      <label className="flex flex-col gap-1 text-small font-semibold">
        {t("province")}
        <select
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          className={`${selectClasses} font-normal`}
        >
          <option value="">{t("all")}</option>
          {ankara ? <option value={ankara.id}>{ankara.name}</option> : null}
          {provinces
            .filter((item) => item.id !== ankara?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      <Checkbox
        label={t("compare")}
        checked={compare}
        onChange={(event) => setCompare(event.target.checked)}
        className="h-10"
      />
      <Button compact onClick={apply}>
        {t("apply")}
      </Button>
    </div>
  );
}
