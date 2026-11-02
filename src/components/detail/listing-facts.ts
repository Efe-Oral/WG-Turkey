import {
  ArrowUpDown,
  Bath,
  BrickWall,
  Building2,
  Car,
  Fence,
  Flame,
  Layers,
  PawPrint,
  Sofa,
  Utensils,
  WashingMachine,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { ListingDetail } from "@/lib/listings/types";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const AMENITY_ICONS: Record<string, LucideIcon> = {
  parking: Car,
  elevator: ArrowUpDown,
  balcony: Fence,
  washing_machine: WashingMachine,
  dishwasher: Utensils,
  pets_allowed: PawPrint,
};

/** Section 5.3 item 8: only what the lister actually filled in. */
export function buildFeatureItems(
  listing: ListingDetail,
  t: Translate,
  enums: Translate,
): { icon: LucideIcon; label: string }[] {
  const items: { icon: LucideIcon; label: string }[] = [];

  if (listing.building_age) {
    items.push({
      icon: Building2,
      label: t("buildingAge", { value: listing.building_age }),
    });
  }
  if (listing.floor) {
    items.push({
      icon: Layers,
      label: t("floor", { value: floorLabel(listing.floor, enums) }),
    });
  }
  if (listing.furnishing) {
    items.push({ icon: Sofa, label: enums(`furnishing.${listing.furnishing}`) });
  }
  if (listing.heating) {
    items.push({
      icon: Flame,
      label: t("heatingLabel", { value: enums(`heating.${listing.heating}`) }),
    });
  }
  if (listing.bathroom.length > 0) {
    items.push({
      icon: Bath,
      label: t("bathroomLabel", {
        value: listing.bathroom.map((item) => enums(`bathroom.${item}`)).join(", "),
      }),
    });
  }
  if (listing.internet_type) {
    const type = enums(`internet.${listing.internet_type}`);
    items.push({
      icon: Wifi,
      label: t("internetLabel", {
        value:
          listing.internet_speed && listing.internet_type !== "none"
            ? t("internetSpeed", { type, speed: listing.internet_speed })
            : type,
      }),
    });
  }
  if (listing.flooring) {
    items.push({
      icon: BrickWall,
      label: t("floorType", { value: enums(`flooring.${listing.flooring}`) }),
    });
  }
  for (const amenity of listing.amenities) {
    const icon = AMENITY_ICONS[amenity];
    if (icon) items.push({ icon, label: enums(`amenity.${amenity}`) });
  }

  return items;
}

export function floorLabel(floor: string, enums: Translate): string {
  return /^\d/.test(floor)
    ? enums("floorNumber", { floor })
    : enums(`floor.${floor}`);
}
