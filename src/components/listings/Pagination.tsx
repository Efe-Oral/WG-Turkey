import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

/** Page numbers to show: "1 2 3 4 5 ... 10" around the current page. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 5));
  const numbers = Array.from({ length: 5 }, (_, index) => start + index);
  const items: (number | "gap")[] = [...numbers];

  if (start > 1) items.unshift(1, ...(start > 2 ? (["gap"] as const) : []));
  if (numbers.at(-1)! < totalPages) {
    if (numbers.at(-1)! < totalPages - 1) items.push("gap");
    items.push(totalPages);
  }

  return items;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  const t = useTranslations("search");

  if (totalPages <= 1) return null;

  const linkClasses =
    "flex size-9 items-center justify-center rounded-pill hover:bg-black/4 hover:no-underline";

  return (
    <nav aria-label={t("paginationLabel")} className="mt-6">
      <ul className="flex flex-wrap items-center justify-center gap-1 tabular-nums">
        {page > 1 ? (
          <li>
            <Link
              href={hrefFor(page - 1)}
              aria-label={t("previousPage")}
              className={linkClasses}
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </Link>
          </li>
        ) : null}
        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1">
              ...
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-label={t("pageNumber", { page: item })}
                aria-current={item === page ? "page" : undefined}
                className={clsx(
                  linkClasses,
                  item === page && "bg-cyan font-bold hover:bg-cyan",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        {page < totalPages ? (
          <li>
            <Link
              href={hrefFor(page + 1)}
              aria-label={t("nextPage")}
              className={linkClasses}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
