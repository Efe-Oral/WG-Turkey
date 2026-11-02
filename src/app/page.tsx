import {
  BedDouble,
  Building,
  Check,
  DoorOpen,
  MessageCircle,
  PlusCircle,
  Search,
  ShieldCheck,
  Sofa,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { HomeSearch } from "@/components/listings/HomeSearch";
import { Card } from "@/components/ui/Card";
import { getProvinces } from "@/lib/geo";
import { CATEGORY_SLUGS, type ListingCategory } from "@/lib/listings/constants";
import { DEFAULT_CITY, LAST_CITY_COOKIE } from "@/lib/site";

const CATEGORY_CARDS: {
  category: ListingCategory;
  icon: typeof BedDouble;
  title: "roomTitle" | "studioTitle" | "flatTitle";
  text: "roomText" | "studioText" | "flatText";
}[] = [
  { category: "room", icon: BedDouble, title: "roomTitle", text: "roomText" },
  { category: "studio", icon: Sofa, title: "studioTitle", text: "studioText" },
  { category: "flat", icon: Building, title: "flatTitle", text: "flatText" },
];

export default async function HomePage() {
  const [t, provinces, cookieStore] = await Promise.all([
    getTranslations("home"),
    getProvinces(),
    cookies(),
  ]);

  const lastCity = cookieStore.get(LAST_CITY_COOKIE)?.value;
  const city =
    provinces.find((province) => province.slug === lastCity)?.slug ?? DEFAULT_CITY;

  const steps = [
    { icon: Search, title: t("step1Title"), text: t("step1Text") },
    { icon: MessageCircle, title: t("step2Title"), text: t("step2Text") },
    { icon: DoorOpen, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <>
      <section className="bg-cyan px-4 py-10 md:py-14">
        <div className="mx-auto max-w-[960px] rounded-modal bg-white p-5 shadow-float">
          <p className="mb-3 font-semibold">{t("searchTitle")}</p>
          <HomeSearch
            cities={provinces.map(({ name, slug }) => ({ name, slug }))}
            initialCity={city}
          />
        </div>
      </section>

      <div className="mx-auto flex max-w-page flex-col gap-10 px-4 py-10 md:px-6">
        <div className="text-center">
          <h1 className="text-h1 font-semibold">{t("title")}</h1>
          <p className="mt-1 text-h3">{t("subtitle")}</p>
        </div>

        <ul className="grid gap-4 md:grid-cols-3">
          {CATEGORY_CARDS.map(({ category, icon: Icon, title, text }) => (
            <li key={category}>
              <Card className="flex h-full flex-col items-center gap-2 p-5 text-center">
                <Icon aria-hidden="true" size={28} className="text-graphite" />
                <h2 className="text-h3 font-semibold">{t(title)}</h2>
                <p>{t(text)}</p>
                <Link href={`/${city}/${CATEGORY_SLUGS[category]}`} className="mt-1">
                  <span className="sr-only">{t(title)}: </span>
                  {t("searchNow")}
                </Link>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="flex flex-col gap-3 p-5 md:flex-row md:gap-5">
          <PlusCircle aria-hidden="true" size={32} className="shrink-0 text-graphite" />
          <div>
            <h2 className="text-h3 font-semibold">{t("postTitle")}</h2>
            <p className="mt-1">{t("postText")}</p>
            <ul className="my-3 flex flex-col gap-1">
              {[t("postBullet1"), t("postBullet2"), t("postBullet3")].map((bullet) => (
                <li key={bullet} className="flex items-center gap-2">
                  <Check aria-hidden="true" size={16} />
                  {bullet}
                </li>
              ))}
            </ul>
            <Link
              href="/ilan-ver"
              className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
            >
              {t("postButton")}
            </Link>
          </div>
        </Card>

        <section id="nasil-calisir" className="scroll-mt-4">
          <h2 className="mb-4 text-center text-h2 font-semibold">{t("howTitle")}</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-pill bg-black/4">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <h3 className="text-h3 font-semibold">{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="flex flex-wrap items-center justify-center gap-2 rounded-card bg-black/4 p-4 text-center">
          <ShieldCheck aria-hidden="true" size={20} />
          {t("safety")}
          <Link href="/guvenlik" className="underline">
            {t("safetyLink")}
          </Link>
        </p>
      </div>
    </>
  );
}
