"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, LocateFixed, RefreshCw, Database } from "lucide-react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { SmsDecodedBanner } from "@/components/SmsDecodedBanner";
import { ReportForm } from "@/components/ReportForm";
import { FeedList } from "@/components/FeedList";
import type { BeaconReport } from "@/types/beacon";

export default function HomePage() {
  const [reports, setReports] = useState<BeaconReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [persistent, setPersistent] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [kindFilter, setKindFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        radiusKm: String(radiusKm),
        kind: kindFilter,
        category: categoryFilter
      });
      if (userCoords) {
        params.set("lat", String(userCoords.lat));
        params.set("lng", String(userCoords.lng));
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      setReports(data.reports ?? []);
      setPersistent(Boolean(data.persistent));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [radiusKm, kindFilter, categoryFilter, userCoords]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white">
              <Radio className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              BeaconMesh
            </h1>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
              Civic Mutual Aid Ledger
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400 sm:text-sm">
            Zero-login, offline-resilient neighborhood coordination for verified
            medical, water, shelter, and hazard alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-300">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            {persistent ? "Upstash Redis Edge" : "Memory Sandbox Mode"}
          </span>
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <LocateFixed className="h-3.5 w-3.5 text-red-400" />
            {userCoords
              ? `${userCoords.lat.toFixed(2)}, ${userCoords.lng.toFixed(2)}`
              : "Enable GPS Filter"}
          </button>
        </div>
      </header>

      <OfflineBanner onSynced={fetchReports} />
      <SmsDecodedBanner />
      <OnboardingGuide />

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <ReportForm
            userCoords={userCoords}
            onRequestLocation={requestLocation}
            onCreated={fetchReports}
          />
        </section>

        <section className="lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                aria-label="Filter by Need or Offer"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200"
              >
                <option value="all">All Posts (Needs & Offers)</option>
                <option value="need">Needs Only</option>
                <option value="offer">Offers Only</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by Category"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200"
              >
                <option value="all">All Categories</option>
                <option value="medical">Medical / Blood</option>
                <option value="water_food">Water & Food</option>
                <option value="shelter">Shelter / Power</option>
                <option value="hazard">Road / Hazard</option>
              </select>

              {userCoords && (
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  aria-label="Filter by Radius"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  <option value={5}>Within 5 km</option>
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km</option>
                  <option value={250}>Within 250 km</option>
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={fetchReports}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <FeedList
            reports={reports}
            loading={loading}
            onUpdated={(updated) =>
              setReports((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
              )
            }
          />
        </section>
      </div>
    </main>
  );
}
