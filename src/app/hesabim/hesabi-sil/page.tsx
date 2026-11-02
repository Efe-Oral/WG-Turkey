import { getTranslations } from "next-intl/server";
import { DeleteAccountForm } from "@/components/account/SimpleForms";

export default async function DeleteAccountPage() {
  const t = await getTranslations("deletePage");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>{t("warning")}</p>
      <DeleteAccountForm />
    </div>
  );
}
