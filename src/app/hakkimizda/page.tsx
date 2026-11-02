import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: `${t("aboutTitle")} | EvArkadaşıAra` };
}

export default async function Page() {
  const t = await getTranslations("legal");

  return (
    <LegalPage title={t("aboutTitle")}>
      <p>{t("aboutText")}</p>
    </LegalPage>
  );
}
