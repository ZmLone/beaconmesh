"use client";

import { useState } from "react";
import {
  CheckCircle,
  Share2,
  MapPin,
  Clock,
  Navigation,
  CheckCheck,
  PhoneCall,
  Siren
} from "lucide-react";
import { formatSmsFallbackText } from "@/lib/compactEncoder";
import { buildDirectionsUrl, extractDialablePhone } from "@/lib/geo";
import type { BeaconReport } from "@/types/beacon";

interface FeedListProps {
  daylight: boolean;
  reports: BeaconReport[];
  loading: boolean;
  onUpdated: (updated: BeaconReport) => void;
  onSwitchToPost: () => void;
}

const CATEGORY_LABELS: Record<BeaconReport["category"], string> = {
  medical: "Medical / Blood",
  water_food: "Water & Food",
  shelter: "Shelter / Power",
  hazard: "Road / Hazard"
};

export function FeedList({
  daylight,
  reports,
  loading,
  onUpdated,
  onSwitchToPost
}: FeedListProps) {
  const [vouchedIds, setVouchedIds] = useState<Record<string, boolean>>({});
  const [resolvingIds, setResolvingIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleVerify(id: string) {
    if (vouchedIds[id]) return;
    setVouchedIds((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/reports/${id}/verify`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.report);
      }
    } catch {
      setVouchedIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleResolve(id: string) {
    if (resolvingIds[id]) return;
    setResolvingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/reports/${id}/resolve`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.report);
      }
    } finally {
      setResolvingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleShareCompact(report: BeaconReport) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const smsPayload = formatSmsFallbackText(report, origin);
    try {
      await navigator.clipboard.writeText(smsPayload);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt("Copy SMS payload:", smsPayload);
    }
  }

  if (loading) {
    return (
      <div
        className={`rounded-2xl border-2 p-10 text-center text-sm font-semibold ${
          daylight
            ? "border-zinc-300 bg-white text-zinc-700"
            : "border-zinc-800 bg-zinc-900 text-zinc-300"
        }`}
      >
        Scanning nearby emergency alerts...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div
        className={`rounded-2xl border-2 p-8 text-center ${
          daylight
            ? "border-zinc-300 bg-white text-zinc-900"
            : "border-zinc-800 bg-zinc-900 text-zinc-100"
        }`}
      >
        <p className="text-base font-bold">
          No active alerts in your selected area.
        </p>
        <p className="mt-1 text-xs opacity-75">
          Expand your distance filter or broadcast a new need/offer.
        </p>
        <button
          type="button"
          onClick={onSwitchToPost}
          className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500"
        >
          + Post First Alert
        </button>
      </div>
    );
  }

  const criticalActive = reports.filter(
    (r) => !r.resolved && r.urgency === "critical"
  );
  const standardReports = reports.filter(
    (r) => r.resolved || r.urgency !== "critical"
  );

  function renderCard(report: BeaconReport, isPinnedUrgent = false) {
    const isNeed = report.kind === "need";
    const isResolved = Boolean(report.resolved);
    const dialPhone = extractDialablePhone(report.contact);
    const expiresInHrs = Math.max(
      1,
      Math.round((report.expiresAt - Date.now()) / (1000 * 60 * 60))
    );

    const cardSurface = isResolved
      ? daylight
        ? "border-zinc-300 bg-zinc-100 text-zinc-600"
        : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
      : isPinnedUrgent
      ? daylight
        ? "border-red-600 bg-red-50 text-zinc-950"
        : "border-red-500 bg-red-950/35 text-white"
      : daylight
      ? "border-zinc-300 bg-white text-zinc-950"
      : "border-zinc-800 bg-zinc-900 text-zinc-100";

    const accentBorder = isResolved
      ? "border-l-zinc-500"
      : isNeed
      ? "border-l-red-600"
      : "border-l-emerald-600";

    return (
      <article
        key={report.id}
        className={`rounded-2xl border-2 border-l-8 p-4 shadow-sm transition ${cardSurface} ${accentBorder}`}
      >
        {/* Top Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
                isResolved
                  ? "bg-zinc-600 text-white"
                  : isNeed
                  ? "bg-red-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {isResolved ? "RESOLVED" : isNeed ? "NEED HELP" : "OFFER AID"}
            </span>
            <span
              className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                daylight
                  ? "bg-zinc-200 text-zinc-900"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              {CATEGORY_LABELS[report.category]}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            {typeof report.distanceKm === "number" && (
              <span className="text-red-500">{report.distanceKm} km</span>
            )}
            <span className="inline-flex items-center gap-1 opacity-70">
              <Clock className="h-3.5 w-3.5" />
              {isResolved ? "Closed" : `${expiresInHrs}h`}
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <h3
          className={`mt-2.5 text-lg font-extrabold leading-snug ${
            isResolved ? "line-through opacity-70" : ""
          }`}
        >
          {report.title}
        </h3>

        {report.details && (
          <p className="mt-1 text-sm leading-relaxed opacity-85">
            {report.details}
          </p>
        )}

        {/* Landmark Line */}
        <div className="mt-3 flex items-start gap-1.5 text-xs font-semibold opacity-90">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>
            {report.landmark}
            {report.contact && !dialPhone ? ` • ${report.contact}` : ""}
          </span>
        </div>

        {/* Primary Action Buttons: Call + Directions */}
        {!isResolved && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {dialPhone ? (
              <a
                href={`tel:${dialPhone}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow hover:bg-emerald-500"
              >
                <PhoneCall className="h-4 w-4" />
                Call Now
              </a>
            ) : (
              <button
                type="button"
                disabled={Boolean(vouchedIds[report.id])}
                onClick={() => handleVerify(report.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-extrabold transition ${
                  vouchedIds[report.id]
                    ? "bg-emerald-600 text-white"
                    : daylight
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {vouchedIds[report.id]
                  ? `Confirmed (${report.verifications})`
                  : `Confirm (${report.verifications})`}
              </button>
            )}

            <a
              href={buildDirectionsUrl(report.lat, report.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-extrabold text-white shadow hover:bg-sky-500"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </a>
          </div>
        )}

        {/* Secondary Actions Row */}
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-xs font-bold ${
            daylight ? "border-zinc-200" : "border-zinc-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {dialPhone && !isResolved && (
              <button
                type="button"
                disabled={Boolean(vouchedIds[report.id])}
                onClick={() => handleVerify(report.id)}
                className="inline-flex items-center gap-1 text-emerald-500 hover:underline disabled:opacity-60"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {vouchedIds[report.id]
                  ? `Confirmed (${report.verifications})`
                  : `Confirm (${report.verifications})`}
              </button>
            )}

            {!isResolved && (
              <button
                type="button"
                disabled={Boolean(resolvingIds[report.id])}
                onClick={() => handleResolve(report.id)}
                className="inline-flex items-center gap-1 opacity-75 hover:opacity-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark Resolved
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleShareCompact(report)}
            className="inline-flex items-center gap-1 opacity-75 hover:opacity-100"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copiedId === report.id ? "SMS Copied!" : "Share SMS"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      {criticalActive.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-red-500">
            <Siren className="h-4 w-4" />
            Urgent SOS Dispatch ({criticalActive.length})
          </div>
          {criticalActive.map((r) => renderCard(r, true))}
        </div>
      )}

      {standardReports.length > 0 && (
        <div className="space-y-3">
          {criticalActive.length > 0 && (
            <div className="pt-1 text-xs font-bold uppercase tracking-wider opacity-60">
              Nearby Updates ({standardReports.length})
            </div>
          )}
          {standardReports.map((r) => renderCard(r, false))}
        </div>
      )}
    </div>
  );
}
