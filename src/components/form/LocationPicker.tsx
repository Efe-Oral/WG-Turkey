"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const DEFAULT_CENTER: [number, number] = [39.92, 32.85];

type LocationPickerProps = {
  label: string;
  center: { lat: number; lng: number } | null;
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
};

/** The exact pin. It is stored privately and never shown on the public page. */
export function LocationPicker({
  label,
  center,
  value,
  onChange,
}: LocationPickerProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | undefined>(undefined);
  const marker = useRef<import("leaflet").Marker | undefined>(undefined);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const initial = useRef(value);

  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !container.current) return;

      const start = initial.current;
      const instance = L.map(container.current, {
        scrollWheelZoom: false,
      }).setView(start ? [start.lat, start.lng] : DEFAULT_CENTER, start ? 16 : 11);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);

      const pin = L.marker(start ? [start.lat, start.lng] : DEFAULT_CENTER, {
        draggable: true,
        autoPan: true,
        icon: L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: '<span style="display:block;width:24px;height:24px;border-radius:999px;background:#35E5FD;border:2px solid #000"></span>',
        }),
      }).addTo(instance);

      const report = () => {
        const { lat, lng } = pin.getLatLng();
        onChangeRef.current({ lat, lng });
      };

      pin.on("dragend", report);
      instance.on("click", (event) => {
        pin.setLatLng(event.latlng);
        report();
      });

      map.current = instance;
      marker.current = pin;
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = undefined;
    };
  }, []);

  // Choosing a district moves the map there, until the user has placed a pin.
  useEffect(() => {
    if (center && !value && map.current && marker.current) {
      map.current.setView([center.lat, center.lng], 14);
      marker.current.setLatLng([center.lat, center.lng]);
    }
  }, [center, value]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className="relative z-0 h-64 overflow-hidden rounded-card"
    />
  );
}
