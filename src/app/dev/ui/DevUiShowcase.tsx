"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Radio } from "@/components/ui/Choice";
import { Chip } from "@/components/ui/Chip";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TextInput } from "@/components/ui/TextInput";
import { Toast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import {
  formatArea,
  formatDate,
  formatMonthlyPrice,
  toTurkishUpperCase,
} from "@/lib/format";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-black/12 py-6">
      <h2 className="mb-4 text-h2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const SAMPLE_DATE = new Date("2026-12-01T12:00:00+03:00");

export function DevUiShowcase() {
  const t = useTranslations("devUi");
  const common = useTranslations("common");
  const [categories, setCategories] = useState<string[]>(["room", "flat"]);
  const [selectedChip, setSelectedChip] = useState(true);

  const swatches = [
    { name: t("colorCyan"), hex: "#35E5FD", className: "bg-cyan" },
    { name: t("colorGraphite"), hex: "#484848", className: "bg-graphite" },
    { name: t("colorBlack"), hex: "#000000", className: "bg-black" },
    {
      name: t("colorWhite"),
      hex: "#FFFFFF",
      className: "border border-black/12 bg-white",
    },
    { name: t("colorError"), hex: "#C62828", className: "bg-error" },
    { name: t("colorValid"), hex: "#2E7D32", className: "bg-valid" },
  ];

  return (
    <div className="mx-auto max-w-page px-4 py-6 md:px-6">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p className="mt-1 mb-6 text-black/60">{t("intro")}</p>

      <Section title={t("colors")}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {swatches.map((swatch) => (
            <li key={swatch.hex}>
              <div className={`h-14 rounded-card ${swatch.className}`} />
              <p className="mt-1 text-meta font-semibold">{swatch.name}</p>
              <p className="text-small text-black/60 tabular-nums">
                {swatch.hex}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("typography")}>
        <div className="flex flex-col gap-2">
          <p className="text-h1 font-semibold">{t("typeH1")}</p>
          <p className="text-h2 font-semibold">{t("typeH2")}</p>
          <p className="text-h3 font-semibold">{t("typeH3")}</p>
          <p>{t("typeBody")}</p>
          <p className="text-meta text-black/60">{t("typeMeta")}</p>
          <p className="text-small text-black/60">{t("typeSmall")}</p>
          <p>
            <span className="text-meta font-semibold">
              {t("upperCaseLabel")}:{" "}
            </span>
            {toTurkishUpperCase(t("upperCaseExample"))}
          </p>
        </div>
      </Section>

      <Section title={t("formatting")}>
        <ul className="flex flex-col gap-1 tabular-nums">
          <li className="text-price font-bold">{formatMonthlyPrice(12500)}</li>
          <li>{formatArea(15)}</li>
          <li>{formatDate(SAMPLE_DATE)}</li>
        </ul>
      </Section>

      <Section title={t("buttons")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("buttonPrimary")}</Button>
          <Button compact>{t("buttonPrimaryCompact")}</Button>
          <Button variant="secondary">{t("buttonSecondary")}</Button>
          <Button variant="dark">
            <Search aria-hidden="true" size={18} />
            {t("buttonDark")}
          </Button>
          <Button variant="ghost">{t("buttonGhost")}</Button>
          <Button disabled>{t("buttonDisabled")}</Button>
        </div>
      </Section>

      <Section title={t("inputs")}>
        <div className="grid gap-4 md:grid-cols-3">
          <TextInput
            label={t("inputDefaultLabel")}
            placeholder={t("inputDefaultPlaceholder")}
          />
          <TextInput
            label={t("inputValidLabel")}
            defaultValue={t("inputValidValue")}
            valid
          />
          <TextInput
            label={t("inputErrorLabel")}
            defaultValue={t("inputErrorValue")}
            error={t("inputErrorHelper")}
          />
        </div>
      </Section>

      <Section title={t("dropdowns")}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-1 text-meta font-semibold">
              {t("dropdownSingleLabel")}
            </p>
            <Dropdown
              label={t("dropdownSingleLabel")}
              placeholder={t("any")}
              options={[
                { value: "allowed", label: t("smokingAllowed") },
                { value: "balcony", label: t("smokingBalcony") },
                { value: "not_allowed", label: t("smokingNotAllowed") },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-meta font-semibold">
              {t("dropdownMultiLabel")}
            </p>
            <MultiSelect
              label={t("dropdownMultiLabel")}
              placeholder={t("any")}
              selectedLabel={t("selectedCount", { count: categories.length })}
              value={categories}
              onValueChange={setCategories}
              options={[
                { value: "room", label: t("categoryRoom") },
                { value: "studio", label: t("categoryStudio") },
                { value: "flat", label: t("categoryFlat") },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-meta font-semibold">
              {t("dropdownSortLabel")}
            </p>
            <Dropdown
              label={t("dropdownSortLabel")}
              placeholder={t("sortNewest")}
              defaultValue="newest"
              options={[
                { value: "newest", label: t("sortNewest") },
                { value: "price_low", label: t("sortPriceLow") },
                { value: "price_high", label: t("sortPriceHigh") },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title={t("choices")}>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="flex flex-col gap-2">
            <Checkbox label={t("checkboxBalcony")} defaultChecked />
            <Checkbox label={t("checkboxElevator")} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-meta font-semibold">
              {t("rentalTermLegend")}
            </legend>
            <Radio name="term" label={t("radioOpenEnded")} defaultChecked />
            <Radio name="term" label={t("radioFixed")} />
          </fieldset>
          <Toggle label={t("toggleLabel")} />
        </div>
      </Section>

      <Section title={t("chips")}>
        <div className="flex flex-wrap gap-2">
          <Chip>{t("chipDefault")}</Chip>
          <Chip
            selected={selectedChip}
            onClick={() => setSelectedChip(!selectedChip)}
          >
            {t("chipSelected")}
          </Chip>
        </div>
      </Section>

      <Section title={t("cards")}>
        <Card className="max-w-md p-4">
          <h3 className="text-h3 font-semibold">{t("cardTitle")}</h3>
          <p className="mt-1 text-meta text-black/60">{t("cardText")}</p>
          <p className="mt-2 text-price font-bold tabular-nums">
            {formatMonthlyPrice(12500)}
          </p>
        </Card>
      </Section>

      <Section title={t("overlays")}>
        <div className="flex flex-wrap gap-3">
          <Modal
            title={t("modalTitle")}
            closeLabel={common("close")}
            trigger={<Button variant="secondary">{t("openModal")}</Button>}
          >
            <p className="mb-4">{t("modalText")}</p>
            <Button>{t("modalConfirm")}</Button>
          </Modal>
          <Toast
            message={t("toastText")}
            renderTrigger={(show) => (
              <Button variant="secondary" onClick={show}>
                {t("showToast")}
              </Button>
            )}
          />
        </div>
      </Section>

      <Section title={t("avatars")}>
        <div className="flex items-center gap-3">
          <Avatar name={t("avatarNameOne")} />
          <Avatar name={t("avatarNameTwo")} size={56} />
          <Avatar
            name={t("avatarNameOne")}
            src="/icon.svg"
            alt={t("avatarPhotoAlt")}
            size={56}
          />
        </div>
      </Section>

      <Section title={t("emptyState")}>
        <EmptyState
          text={t("emptyText")}
          action={<Button>{t("emptyAction")}</Button>}
        />
      </Section>
    </div>
  );
}
