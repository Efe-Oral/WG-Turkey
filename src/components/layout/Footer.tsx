import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Fragment } from "react";

const POPULAR_CITIES = [
  { name: "Ankara", slug: "ankara" },
  { name: "İstanbul", slug: "istanbul" },
  { name: "İzmir", slug: "izmir" },
  { name: "Eskişehir", slug: "eskisehir" },
  { name: "Bursa", slug: "bursa" },
  { name: "Antalya", slug: "antalya" },
  { name: "Konya", slug: "konya" },
  { name: "Kocaeli", slug: "kocaeli" },
];

const ANKARA_DISTRICTS = [
  { name: "Çankaya", slug: "cankaya" },
  { name: "Keçiören", slug: "kecioren" },
  { name: "Yenimahalle", slug: "yenimahalle" },
  { name: "Etimesgut", slug: "etimesgut" },
  { name: "Mamak", slug: "mamak" },
];

type FooterLink = { label: string; href: string };

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="mb-2 text-meta font-semibold">{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block py-1 text-meta font-normal text-black/60"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PipeLinks({ links }: { links: FooterLink[] }) {
  return (
    <p className="text-meta">
      {links.map((link, index) => (
        <Fragment key={link.label}>
          {index > 0 ? <span aria-hidden="true"> | </span> : null}
          <Link href={link.href} className="inline-block py-1">
            {link.label}
          </Link>
        </Fragment>
      ))}
    </p>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

  return (
    <footer>
      <nav
        aria-label={t("linksNav")}
        className="mx-auto grid max-w-page grid-cols-2 gap-6 border-t border-black/12 px-4 py-8 md:grid-cols-4 md:px-6"
      >
        <LinkColumn
          title={t("popularCities")}
          links={POPULAR_CITIES.map((city) => ({
            label: city.name,
            href: `/${city.slug}`,
          }))}
        />
        <LinkColumn
          title={t("ankaraDistricts")}
          links={ANKARA_DISTRICTS.map((district) => ({
            label: district.name,
            href: `/ankara/${district.slug}`,
          }))}
        />
        <LinkColumn
          title={t("categories")}
          links={[
            { label: t("categoryRoom"), href: "/ankara/oda" },
            { label: t("categoryStudio"), href: "/ankara/studyo" },
            { label: t("categoryFlat"), href: "/ankara/daire" },
          ]}
        />
        <LinkColumn
          title={t("info")}
          links={[
            { label: t("howItWorks"), href: "/#nasil-calisir" },
            { label: t("safetyTips"), href: "/guvenlik" },
          ]}
        />
      </nav>

      <div className="bg-graphite text-white">
        <nav
          aria-label={t("legalNav")}
          className="mx-auto flex max-w-page flex-col gap-2 px-4 py-6 md:px-6"
        >
          <PipeLinks
            links={[
              { label: t("help"), href: "/iletisim" },
              { label: t("about"), href: "/hakkimizda" },
              { label: t("terms"), href: "/kullanim-sartlari" },
              { label: t("kvkk"), href: "/kvkk" },
              { label: t("privacy"), href: "/gizlilik" },
              { label: t("cookies"), href: "/cerez-politikasi" },
              { label: t("contact"), href: "/iletisim" },
            ]}
          />
          <PipeLinks
            links={[
              { label: t("viewListings"), href: "/ilanlar" },
              { label: t("post"), href: "/ilan-ver" },
              { label: t("feedback"), href: "/iletisim" },
            ]}
          />
        </nav>
      </div>

      <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3 text-meta md:px-6">
        {instagramUrl ? (
          <a href={instagramUrl} rel="noopener" className="inline-block py-1">
            {t("instagram")}
          </a>
        ) : (
          <span>{t("instagram")}</span>
        )}
        {/* Placeholder until a second locale exists. */}
        <span className="inline-flex items-center gap-1">
          <Globe aria-hidden="true" size={16} />
          <span className="sr-only">{t("language")}: </span>
          {t("languageCode")}
        </span>
      </div>
    </footer>
  );
}
