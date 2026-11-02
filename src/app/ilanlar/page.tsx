import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProvinceBySlug } from "@/lib/geo";
import { DEFAULT_CITY, LAST_CITY_COOKIE } from "@/lib/site";

export default async function ListingsRedirectPage() {
  const cookieStore = await cookies();
  const lastCity = cookieStore.get(LAST_CITY_COOKIE)?.value;
  const province = lastCity ? await getProvinceBySlug(lastCity) : undefined;

  redirect(`/${province?.slug ?? DEFAULT_CITY}`);
}
