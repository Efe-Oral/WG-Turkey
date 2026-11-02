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

    const start = async () => {
      // Leaflet touches window on import, so it loads in the browser only.
      const { default: L } = await import("leaflet");
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
    };

    // The map sits far down the page, so it waits until it is nearly in view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "300px" },
    );
    if (container.current) observer.observe(container.current);

    return () => {
      cancelled = true;
      observer.disconnect();
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
