import { useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto flex max-w-page flex-col items-center gap-4 px-4 py-16 text-center md:px-6">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      <p>{t("text")}</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
      >
        {t("action")}
      </Link>
    </div>
  );
}
