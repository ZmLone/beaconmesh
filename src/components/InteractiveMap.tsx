"use client";

import { useEffect, useRef } from "react";
import { Navigation, PhoneCall, MapPin } from "lucide-react";
import { buildDirectionsUrl, extractDialablePhone } from "@/lib/geo";
import type { BeaconReport } from "@/types/beacon";

interface InteractiveMapProps {
  daylight: boolean;
  reports: BeaconReport[];
  userCoords: { lat: number; lng: number } | null;
  selectedReport: BeaconReport | null;
  onSelectReport: (report: BeaconReport) => void;
}

declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement, opts?: Record<string, unknown>) => {
        setView: (coords: [number, number], zoom: number) => void;
        remove: () => void;
      };
      tileLayer: (url: string, opts?: Record<string, unknown>) => {
        addTo: (map: unknown) => void;
      };
      divIcon: (opts: Record<string, unknown>) => unknown;
      marker: (coords: [number, number], opts?: Record<string, unknown>) => {
        addTo: (map: unknown) => {
          on: (event: string, cb: () => void) => void;
        };
      };
    };
  }
}

export function InteractiveMap({
  daylight,
  reports,
  userCoords,
  selectedReport,
  onSelectReport
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);

  const activeReports = reports.filter((r) => !r.resolved);
  const centerLat =
    userCoords?.lat ??
    activeReports[0]?.lat ??
    34.0837;
  const centerLng =
    userCoords?.lng ??
    activeReports[0]?.lng ??
    74.7973;

  useEffect(() => {
    let cancelled = false;

    async function ensureLeafletAndRender() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise<void>((resolve) => {
          const existing = document.getElementById("leaflet-js");
          if (existing) {
            existing.addEventListener("load", () => resolve());
            return;
          }
          const script = document.createElement("script");
          script.id = "leaflet-js";
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      if (cancelled || !window.L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = window.L;
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      });
      map.setView([centerLat, centerLng], userCoords ? 12 : 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
      }).addTo(map);

      if (userCoords) {
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0ea5e9;border:3px solid white;box-shadow:0 0 0 4px rgba(14,165,233,0.35);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
      }

      activeReports.forEach((rep) => {
        const bg =
          rep.kind === "need"
            ? "#dc2626"
            : rep.kind === "offer"
            ? "#059669"
            : "#0284c7";
        const pinIcon = L.divIcon({
          className: "",
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:${bg};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:11px;">${
            rep.kind === "need" ? "!" : rep.kind === "offer" ? "+" : "✓"
          }</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([rep.lat, rep.lng], { icon: pinIcon })
          .addTo(map)
          .on("click", () => onSelectReport(rep));
      });

      mapInstanceRef.current = map;
    }

    ensureLeafletAndRender();
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, activeReports.length, userCoords]);

  const activeSelection = selectedReport || activeReports[0] || null;
  const dialPhone = activeSelection
    ? extractDialablePhone(activeSelection.contact)
    : null;

  return (
    <div className="space-y-3">
      {/* Legend Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
          daylight
            ? "border-zinc-200 bg-white text-zinc-700"
            : "border-zinc-800 bg-zinc-900 text-zinc-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            Need ({activeReports.filter((r) => r.kind === "need").length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Offer ({activeReports.filter((r) => r.kind === "offer").length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            You
          </span>
        </div>
        <span className="opacity-70">Tap any pin to inspect</span>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="h-[340px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 z-0"
      />

      {/* Selected Pin Preview Card */}
      {activeSelection && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            daylight
              ? "border-zinc-200 bg-white text-zinc-950"
              : "border-zinc-800 bg-zinc-900 text-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                activeSelection.kind === "need"
                  ? "bg-red-600/15 text-red-500"
                  : "bg-emerald-600/15 text-emerald-500"
              }`}
            >
              {activeSelection.kind === "need" ? "Need Help" : "Offer Aid"}
            </span>
            {typeof activeSelection.distanceKm === "number" && (
              <span className="text-xs font-semibold text-red-500">
                {activeSelection.distanceKm} km away
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-bold">{activeSelection.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs opacity-75">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
            {activeSelection.landmark}
          </p>
          <div className="mt-3 flex gap-2">
            {dialPhone && (
              <a
                href={`tel:${dialPhone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Call Now
              </a>
            )}
            <a
              href={buildDirectionsUrl(activeSelection.lat, activeSelection.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white"
            >
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
