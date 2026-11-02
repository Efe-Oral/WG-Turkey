"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const RADIUS_METERS = 300;
const CYAN = "#35E5FD";
const GRAPHITE = "#484848";

type ListingMapProps = {
  lat: number;
  lng: number;
  label: string;
};

/** Only ever receives the jittered point, and draws a circle, never a pin. */
export function ListingMap({ lat, lng, label }: ListingMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    // Leaflet touches window on import, so it loads in the browser only.
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !container.current) return;

      map = L.map(container.current, { scrollWheelZoom: false }).setView(
        [lat, lng],
        15,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.circle([lat, lng], {
        radius: RADIUS_METERS,
        color: GRAPHITE,
        weight: 1,
        fillColor: CYAN,
        fillOpacity: 0.35,
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      data-testid="listing-map"
      className="relative z-0 h-72 overflow-hidden rounded-card"
    />
  );
}
