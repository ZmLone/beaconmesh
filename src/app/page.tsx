"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Radio,
  LocateFixed,
  RefreshCw,
  Sun,
  Moon,
  PlusCircle,
  List,
  Map as MapIcon,
  PhoneCall,
  QrCode,
  Search
} from "lucide-react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SmsDecodedBanner } from "@/components/SmsDecodedBanner";
import { ReportForm } from "@/components/ReportForm";
import { FeedList } from "@/components/FeedList";
import { InteractiveMap } from "@/components/InteractiveMap";
import { SosDialerView } from "@/components/SosDialerView";
import { CommunityToolsView } from "@/components/CommunityToolsView";
import type { BeaconReport } from "@/types/beacon";

type NavTab = "feed" | "map" | "post" | "sos" | "qr";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>("feed");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedMapReport, setSelectedMapReport] =
    useState<BeaconReport | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("beaconmesh_daylight");
    if (savedTheme === "1") setDaylight(true);

    const params = new URLSearchParams(window.location.search);
    const alertParam = params.get("alert");
    if (alertParam) setHighlightedId(alertParam);
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
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
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
  }, [radiusKm, kindFilter, categoryFilter, searchQuery, userCoords]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const activeCount = reports.filter((r) => !r.resolved).length;

  return (
    <div
      className={`min-h-screen pb-24 transition-colors ${
        daylight ? "bg-zinc-50 text-zinc-950" : "bg-zinc-950 text-zinc-100"
      }`}
    >
      {/* Sticky Minimal App Top Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          daylight
            ? "border-zinc-200 bg-white/90"
            : "border-zinc-800/80 bg-zinc-950/90"
        }`}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
              <Radio className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight">
                  BeaconMesh
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    persistent ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  title={persistent ? "Live Cloud Sync" : "Sandbox Mode"}
                />
              </div>
              <p className="text-[11px] opacity-65">
                Community Emergency & Aid
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={requestLocation}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                userCoords
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : daylight
                  ? "border-zinc-300 bg-zinc-100 text-zinc-800"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300"
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span>{userCoords ? "GPS" : "Locate"}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                daylight
                  ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                  : "border-zinc-800 bg-zinc-900 text-amber-300"
              }`}
            >
              {daylight ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <OfflineBanner onSynced={fetchReports} />
        <SmsDecodedBanner />

        {activeTab === "feed" && (
          <section className="space-y-3">
            {/* Search & Quick Filter Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blood group, area, hospital, name..."
                  className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:outline-none ${
                    daylight
                      ? "border-zinc-200 bg-white text-zinc-950"
                      : "border-zinc-800 bg-zinc-900 text-white"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={fetchReports}
                aria-label="Refresh"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  daylight
                    ? "border-zinc-200 bg-white text-zinc-800"
                    : "border-zinc-800 bg-zinc-900 text-zinc-200"
                }`}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Horizontal Scrollable Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${
                  daylight
                    ? "border-zinc-200 bg-white text-zinc-900"
                    : "border-zinc-800 bg-zinc-900 text-zinc-200"
                }`}
              >
                <option value="all">All Types</option>
                <option value="need">Needs Only</option>
                <option value="offer">Offers Only</option>
                <option value="safe">Safe Check-Ins</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${
                  daylight
                    ? "border-zinc-200 bg-white text-zinc-900"
                    : "border-zinc-800 bg-zinc-900 text-zinc-200"
                }`}
              >
                <option value="all">All Categories</option>
                <option value="blood">Blood Donors</option>
                <option value="medical">Medical / O2</option>
                <option value="water_food">Water & Food</option>
                <option value="rescue">Rescue / SOS</option>
                <option value="shelter">Shelter / Power</option>
                <option value="hazard">Road / Hazard</option>
              </select>

              {userCoords && (
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${
                    daylight
                      ? "border-zinc-200 bg-white text-zinc-900"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  <option value={5}>5 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={250}>250 km</option>
                </select>
              )}
            </div>

            <FeedList
              daylight={daylight}
              reports={reports}
              loading={loading}
              highlightedId={highlightedId}
              onSwitchToPost={() => setActiveTab("post")}
              onUpdated={(updated) =>
                setReports((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                )
              }
              onRemoved={(id) =>
                setReports((prev) => prev.filter((item) => item.id !== id))
              }
            />
          </section>
        )}

        {activeTab === "map" && (
          <InteractiveMap
            daylight={daylight}
            reports={reports}
            userCoords={userCoords}
            selectedReport={selectedMapReport}
            onSelectReport={setSelectedMapReport}
          />
        )}

        {activeTab === "post" && (
          <ReportForm
            daylight={daylight}
            userCoords={userCoords}
            onRequestLocation={requestLocation}
            onCreated={() => {
              fetchReports();
              setActiveTab("feed");
            }}
          />
        )}

        {activeTab === "sos" && <SosDialerView daylight={daylight} />}

        {activeTab === "qr" && (
          <CommunityToolsView daylight={daylight} userCoords={userCoords} />
        )}
      </main>

      {/* Fixed Thumb-Reachable Bottom App Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md ${
          daylight
            ? "border-zinc-200 bg-white/95 text-zinc-600"
            : "border-zinc-800 bg-zinc-950/95 text-zinc-400"
        }`}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-center px-2 pt-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold ${
              activeTab === "feed" ? "text-red-500" : ""
            }`}
          >
            <List className="h-5 w-5" />
            <span>Feed ({activeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold ${
              activeTab === "map" ? "text-red-500" : ""
            }`}
          >
            <MapIcon className="h-5 w-5" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("post")}
            className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-extrabold text-red-500"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
              <PlusCircle className="h-5 w-5" />
            </span>
            <span>Post</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sos")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold ${
              activeTab === "sos" ? "text-red-500" : ""
            }`}
          >
            <PhoneCall className="h-5 w-5" />
            <span>SOS 112</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold ${
              activeTab === "qr" ? "text-red-500" : ""
            }`}
          >
            <QrCode className="h-5 w-5" />
            <span>QR Poster</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
