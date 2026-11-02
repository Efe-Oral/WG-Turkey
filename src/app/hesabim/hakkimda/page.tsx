import { getTranslations } from "next-intl/server";
import { AboutForm } from "@/components/account/SimpleForms";
import { getViewer } from "@/lib/auth/viewer";

export default async function AboutPage() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("aboutPage")]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <AboutForm initial={viewer?.profile.about ?? ""} />
    </div>
  );
}
