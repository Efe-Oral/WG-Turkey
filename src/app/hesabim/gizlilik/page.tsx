import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/format";

export default async function PrivacyPage() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("privacyPage")]);
  const consent = viewer?.profile.kvkk_consent_at;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>{t("text")}</p>
      <ul className="list-disc pl-5">
        <li>
          <Link href="/kvkk" className="underline">
            {t("kvkk")}
          </Link>
        </li>
        <li>
          <Link href="/gizlilik" className="underline">
            {t("privacy")}
          </Link>
        </li>
      </ul>
      {consent ? (
        <p className="text-meta text-black/60 tabular-nums">
          {t("consent", { date: formatDate(consent) })}
        </p>
      ) : null}
    </div>
  );
}
