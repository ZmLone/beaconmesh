"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Radio,
  LocateFixed,
  RefreshCw,
  Sun,
  Moon,
  Plus,
  ListFilter
} from "lucide-react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { HelpModal } from "@/components/HelpModal";
import { SmsDecodedBanner } from "@/components/SmsDecodedBanner";
import { ReportForm } from "@/components/ReportForm";
import { FeedList } from "@/components/FeedList";
import type { BeaconReport } from "@/types/beacon";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "post">("feed");
  const [daylight, setDaylight] = useState(false);
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

  useEffect(() => {
    const savedTheme = localStorage.getItem("beaconmesh_daylight");
    if (savedTheme === "1") setDaylight(true);
  }, []);

  function toggleTheme() {
    const next = !daylight;
    setDaylight(next);
    localStorage.setItem("beaconmesh_daylight", next ? "1" : "0");
  }

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

  const activeCount = reports.filter((r) => !r.resolved).length;

  return (
    <div
      className={`min-h-screen transition-colors ${
        daylight
          ? "bg-zinc-100 text-zinc-950"
          : "bg-zinc-950 text-zinc-100"
      }`}
    >
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        {/* Clean, Calm Top Bar */}
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
                BeaconMesh
              </h1>
              <p className="text-xs opacity-70">Neighborhood Emergency Board</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestLocation}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                userCoords
                  ? "border-emerald-600/50 bg-emerald-600/15 text-emerald-500"
                  : daylight
                  ? "border-zinc-300 bg-white text-zinc-900"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200"
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span>{userCoords ? "GPS On" : "Lock GPS"}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Daylight or Night High-Contrast Mode"
              title={daylight ? "Switch to Night Mode" : "Switch to Sunlight Mode"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                daylight
                  ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-200"
                  : "border-zinc-700 bg-zinc-900 text-amber-300 hover:bg-zinc-800"
              }`}
            >
              {daylight ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>

            <HelpModal daylight={daylight} />
          </div>
        </header>

        <OfflineBanner onSynced={fetchReports} />
        <SmsDecodedBanner />

        {/* Two Primary Thumb-Friendly Tabs */}
        <nav
          aria-label="Primary Views"
          className={`mb-5 grid grid-cols-2 gap-2 rounded-2xl border-2 p-1.5 ${
            daylight
              ? "border-zinc-300 bg-white"
              : "border-zinc-800 bg-zinc-900"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold transition ${
              activeTab === "feed"
                ? daylight
                  ? "bg-zinc-950 text-white shadow"
                  : "bg-white text-zinc-950 shadow"
                : "opacity-75 hover:opacity-100"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            Live Feed ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("post")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold transition ${
              activeTab === "post"
                ? "bg-red-600 text-white shadow"
                : "text-red-500 hover:bg-red-600/10"
            }`}
          >
            <Plus className="h-4 w-4" />
            Post Alert
          </button>
        </nav>

        {/* Active View */}
        {activeTab === "feed" ? (
          <section>
            {/* Compact Filter Strip */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value)}
                  aria-label="Filter by Need or Offer"
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    daylight
                      ? "border-zinc-300 bg-white text-zinc-900"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  <option value="all">Needs & Offers</option>
                  <option value="need">Needs Only</option>
                  <option value="offer">Offers Only</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by Category"
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    daylight
                      ? "border-zinc-300 bg-white text-zinc-900"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
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
                    aria-label="Filter by Distance"
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                      daylight
                        ? "border-zinc-300 bg-white text-zinc-900"
                        : "border-zinc-800 bg-zinc-900 text-zinc-200"
                    }`}
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
                aria-label="Refresh feed"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                  daylight
                    ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <FeedList
              daylight={daylight}
              reports={reports}
              loading={loading}
              onSwitchToPost={() => setActiveTab("post")}
              onUpdated={(updated) =>
                setReports((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                )
              }
            />
          </section>
        ) : (
          <section>
            <ReportForm
              daylight={daylight}
              userCoords={userCoords}
              onRequestLocation={requestLocation}
              onCreated={() => {
                fetchReports();
                setActiveTab("feed");
              }}
            />
          </section>
        )}

        {/* Subtle Footer Status */}
        <footer className="mt-10 flex items-center justify-center gap-2 text-[11px] opacity-55">
          <span
            className={`h-2 w-2 rounded-full ${
              persistent ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span>
            {persistent
              ? "Live Cloud Sync Active • Zero-Login Anti-Spam Protected"
              : "Sandbox Mode • Zero-Login Anti-Spam Protected"}
          </span>
        </footer>
      </main>
    </div>
  );
}
