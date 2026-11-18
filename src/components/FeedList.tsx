"use client";

import { useState } from "react";
import {
  CheckCircle,
  Share2,
  MapPin,
  Clock,
  AlertTriangle,
  HeartHandshake
} from "lucide-react";
import { formatSmsFallbackText } from "@/lib/compactEncoder";
import type { BeaconReport } from "@/types/beacon";

interface FeedListProps {
  reports: BeaconReport[];
  loading: boolean;
  onVerified: (updated: BeaconReport) => void;
}

const CATEGORY_LABELS: Record<BeaconReport["category"], string> = {
  medical: "Medical / Blood",
  water_food: "Water & Food",
  shelter: "Shelter / Power",
  hazard: "Road / Hazard"
};

export function FeedList({ reports, loading, onVerified }: FeedListProps) {
  const [vouchedIds, setVouchedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleVerify(id: string) {
    if (vouchedIds[id]) return;
    setVouchedIds((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/reports/${id}/verify`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onVerified(data.report);
      }
    } catch {
      setVouchedIds((prev) => ({ ...prev, [id]: false }));
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
      window.prompt("Copy low-bandwidth SMS / WhatsApp payload:", smsPayload);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
        Scanning active neighborhood beacons...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm font-medium text-zinc-200">
          No active reports match your current radius or filter.
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Expand your search radius or submit a ground-truth report on the left.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const isNeed = report.kind === "need";
        const expiresInHrs = Math.max(
          1,
          Math.round((report.expiresAt - Date.now()) / (1000 * 60 * 60))
        );

        return (
          <article
            key={report.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 transition hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                    isNeed
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {isNeed ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <HeartHandshake className="h-3 w-3" />
                  )}
                  {report.kind}
                </span>
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {CATEGORY_LABELS[report.category]}
                </span>
                {report.urgency === "critical" && (
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    CRITICAL
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {typeof report.distanceKm === "number" && (
                  <span className="font-medium text-zinc-200">
                    {report.distanceKm} km away
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires ~{expiresInHrs}h
                </span>
              </div>
            </div>

            <h3 className="mt-2.5 text-base font-semibold text-white">
              {report.title}
            </h3>

            {report.details && (
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                {report.details}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1 text-zinc-300">
                <MapPin className="h-3.5 w-3.5 text-red-400" />
                {report.landmark} ({report.lat.toFixed(4)},{" "}
                {report.lng.toFixed(4)})
              </span>
              {report.contact && (
                <span>
                  Contact: <strong className="text-zinc-200">{report.contact}</strong>
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
              <button
                type="button"
                disabled={Boolean(vouchedIds[report.id])}
                onClick={() => handleVerify(report.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  vouchedIds[report.id]
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                {vouchedIds[report.id] ? "Confirmed" : "Confirm On-Ground"} (
                {report.verifications})
              </button>

              <button
                type="button"
                onClick={() => handleShareCompact(report)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/70 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                <Share2 className="h-3.5 w-3.5" />
                {copiedId === report.id
                  ? "Copied SMS/WhatsApp Payload!"
                  : "Copy Low-Bandwidth SMS"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
