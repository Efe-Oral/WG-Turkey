import { getTranslations } from "next-intl/server";
import { NotificationToggle } from "@/components/account/SimpleForms";
import { getViewer } from "@/lib/auth/viewer";

export default async function SettingsPage() {
  const [viewer, t] = await Promise.all([
    getViewer(),
    getTranslations("settingsPage"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <NotificationToggle enabled={viewer?.profile.email_notifications ?? true} />
    </div>
  );
}
