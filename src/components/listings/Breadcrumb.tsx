import { useTranslations } from "next-intl";
import Link from "next/link";
import { Fragment } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const t = useTranslations("breadcrumb");

  return (
    <>
      <nav aria-label={t("label")} className="text-meta">
        <ol className="flex flex-wrap items-center gap-x-1">
          {items.map((item, index) => (
            <Fragment key={item.label}>
              {index > 0 ? (
                <li aria-hidden="true" className="text-black/60">
                  &gt;
                </li>
              ) : null}
              <li className="max-w-full truncate">
                {item.href ? (
                  <Link href={item.href} className="inline-block py-1 font-normal">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-black/60">
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absoluteUrl(item.href) } : {}),
          })),
        }}
      />
    </>
  );
}
