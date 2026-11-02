"use client";

import Link from "next/link";
import { track } from "@/lib/events/client";

export function EmptyCityLink({
  label,
  provinceId,
}: {
  label: string;
  provinceId: string;
}) {
  return (
    <Link
      href="/ilan-ver"
      onClick={() => track({ name: "empty_city_cta_click", provinceId })}
      className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
    >
      {label}
    </Link>
  );
}
