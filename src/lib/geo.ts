import { cache } from "react";
import { createCachedPublicClient } from "./supabase/public";

export type Province = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  seo_text: string | null;
};

export type District = {
  id: string;
  province_id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
};

export const getProvinces = cache(async (): Promise<Province[]> => {
  const { data, error } = await createCachedPublicClient()
    .from("provinces")
    .select("id, name, slug, lat, lng, seo_text")
    .order("name");

  if (error) throw new Error(`Provinces: ${error.message}`);

  return [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
});

export const getProvinceBySlug = cache(
  async (slug: string): Promise<Province | undefined> => {
    const provinces = await getProvinces();
    return provinces.find((province) => province.slug === slug);
  },
);

export const getDistricts = cache(
  async (provinceId: string): Promise<District[]> => {
    const { data, error } = await createCachedPublicClient()
      .from("districts")
      .select("id, province_id, name, slug, lat, lng")
      .eq("province_id", provinceId)
      .order("name");

    if (error) throw new Error(`Districts: ${error.message}`);

    return [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  },
);
