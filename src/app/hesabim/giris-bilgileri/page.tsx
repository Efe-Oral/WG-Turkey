import { getTranslations } from "next-intl/server";
import { getViewer } from "@/lib/auth/viewer";

export default async function LoginDetailsPage() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("loginPage")]);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>
        <span className="font-semibold">{t("email")}: </span>
        {viewer?.email}
      </p>
      <p className="text-black/60">{t("method")}</p>
    </div>
  );
}
