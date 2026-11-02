import { useTranslations } from "next-intl";
import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  const t = useTranslations("header");
  const common = useTranslations("common");

  return (
    <header className="border-b border-black/12 bg-white">
      <div className="mx-auto flex min-h-16 max-w-page flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:px-6">
        <Link
          href="/"
          aria-label={common("brand")}
          className="inline-flex shrink-0"
        >
          <Logo label={common("brand")} />
        </Link>
        <nav aria-label={t("mainNav")} className="order-3 w-full md:order-none md:w-auto">
          <ul className="flex items-center gap-5">
            <li>
              <Link href="/ilanlar" className="inline-block py-1">
                {t("listings")}
              </Link>
            </li>
            <li>
              <Link href="/guvenlik" className="inline-block py-1">
                {t("safety")}
              </Link>
            </li>
            <li>
              <Link href="/ilan-ver" className="inline-block py-1 font-bold">
                {t("post")}
              </Link>
            </li>
          </ul>
        </nav>
        {/* Becomes the auth modal and account menu in Phase 2. */}
        <button
          type="button"
          className="ml-auto cursor-pointer py-1 font-medium hover:underline"
        >
          {t("account")}
        </button>
      </div>
    </header>
  );
}
