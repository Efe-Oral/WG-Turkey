import { useTranslations } from "next-intl";

// The full homepage arrives in Phase 1.
export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-page px-4 py-12 text-center md:px-6">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p className="mt-2 text-h3">{t("subtitle")}</p>
    </div>
  );
}
