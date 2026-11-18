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
  MessageCircle,
  UserCheck,
  Flag,
  MessageSquarePlus,
  Send
} from "lucide-react";
import {
  formatSmsFallbackText,
  formatWhatsAppShareText
} from "@/lib/compactEncoder";
import {
  buildDirectionsUrl,
  buildWhatsAppUrl,
  extractDialablePhone
} from "@/lib/geo";
import type { BeaconReport } from "@/types/beacon";

interface FeedListProps {
  daylight: boolean;
  reports: BeaconReport[];
  loading: boolean;
  highlightedId: string | null;
  onUpdated: (updated: BeaconReport) => void;
  onRemoved: (id: string) => void;
  onSwitchToPost: () => void;
}

const CATEGORY_LABELS: Record<BeaconReport["category"], string> = {
  blood: "Blood Needed",
  medical: "Medical / O2",
  water_food: "Water & Food",
  rescue: "Rescue / SOS",
  shelter: "Shelter / Power",
  hazard: "Road / Hazard",
  checkin: "Safe Check-In"
};

export function FeedList({
  daylight,
  reports,
  loading,
  highlightedId,
  onUpdated,
  onRemoved,
  onSwitchToPost
}: FeedListProps) {
  const [actedIds, setActedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  async function triggerAction(
    id: string,
    action: "verify" | "respond" | "resolve" | "flag"
  ) {
    const key = `${id}:${action}`;
    if (actedIds[key]) return;
    setActedIds((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch(`/api/reports/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hidden) {
          onRemoved(id);
        } else if (data.report) {
          onUpdated(data.report);
        }
      }
    } catch {
      setActedIds((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleAddComment(id: string) {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/reports/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", text: commentText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) onUpdated(data.report);
        setCommentText("");
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleShareWhatsApp(report: BeaconReport) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = formatWhatsAppShareText(report, origin);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: report.title, text });
        return;
      } catch {}
    }
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleCopySms(report: BeaconReport) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sms = formatSmsFallbackText(report, origin);
    try {
      await navigator.clipboard.writeText(sms);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      window.prompt("Copy SMS link:", sms);
    }
  }

  if (loading) {
    return (
      <div
        className={`rounded-2xl border p-8 text-center text-xs font-semibold ${
          daylight
            ? "border-zinc-200 bg-white text-zinc-600"
            : "border-zinc-800 bg-zinc-900 text-zinc-400"
        }`}
      >
        Loading live neighborhood alerts...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div
        className={`rounded-2xl border p-8 text-center ${
          daylight
            ? "border-zinc-200 bg-white text-zinc-900"
            : "border-zinc-800 bg-zinc-900 text-zinc-100"
        }`}
      >
        <p className="text-sm font-bold">No active alerts in this area.</p>
        <p className="mt-1 text-xs opacity-70">
          Expand your distance filter or post a new need, offer, or safe check-in.
        </p>
        <button
          type="button"
          onClick={onSwitchToPost}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500"
        >
          + Post Alert
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const isNeed = report.kind === "need";
        const isOffer = report.kind === "offer";
        const isResolved = Boolean(report.resolved);
        const isHighlighted = highlightedId === report.id;
        const dialPhone = extractDialablePhone(report.contact);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const shareDeepLink = `${origin}/?alert=${encodeURIComponent(report.id)}`;
        const expiresInHrs = Math.max(
          1,
          Math.round((report.expiresAt - Date.now()) / (1000 * 60 * 60))
        );

        const cardStyle = isResolved
          ? daylight
            ? "border-zinc-200 bg-zinc-100/80 text-zinc-500"
            : "border-zinc-800/70 bg-zinc-900/40 text-zinc-400"
          : isHighlighted
          ? "border-sky-500 ring-2 ring-sky-500/30 " +
            (daylight ? "bg-white text-zinc-950" : "bg-zinc-900 text-zinc-100")
          : daylight
          ? "border-zinc-200 bg-white text-zinc-950"
          : "border-zinc-800 bg-zinc-900 text-zinc-100";

        return (
          <article
            key={report.id}
            className={`rounded-2xl border p-4 shadow-xs transition ${cardStyle}`}
          >
            {/* Top Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    isResolved
                      ? "bg-zinc-500/20 text-zinc-400"
                      : isNeed
                      ? "bg-red-500/15 text-red-500"
                      : isOffer
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-sky-500/15 text-sky-500"
                  }`}
                >
                  {isResolved
                    ? "Resolved"
                    : isNeed
                    ? "Need Help"
                    : isOffer
                    ? "Offer Aid"
                    : "Safe Check-In"}
                </span>

                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    daylight
                      ? "bg-zinc-100 text-zinc-700"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {CATEGORY_LABELS[report.category]}
                </span>

                {report.bloodGroup && (
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {report.bloodGroup}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-[11px] font-semibold">
                {typeof report.distanceKm === "number" && (
                  <span className="text-red-500">{report.distanceKm} km</span>
                )}
                <span className="inline-flex items-center gap-1 opacity-65">
                  <Clock className="h-3 w-3" />
                  {isResolved ? "Closed" : `${expiresInHrs}h`}
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <h3
              className={`mt-2 text-base font-bold leading-snug ${
                isResolved ? "line-through opacity-70" : ""
              }`}
            >
              {report.title}
            </h3>

            {report.details && (
              <p className="mt-1 text-xs sm:text-sm leading-relaxed opacity-80">
                {report.details}
              </p>
            )}

            {report.photoDataUrl && (
              <img
                src={report.photoDataUrl}
                alt="Field report attachment"
                className="mt-2.5 max-h-48 w-full rounded-xl object-cover border border-zinc-800/60"
              />
            )}

            {/* Location & Responder Status */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium opacity-85">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                {report.landmark}
              </span>

              {(report.respondersCount ?? 0) > 0 && !isResolved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                  <UserCheck className="h-3 w-3" />
                  {report.respondersCount} helper(s) en route
                </span>
              )}
            </div>

            {/* Primary Action Buttons */}
            {!isResolved && (
              <div className="mt-3.5 grid grid-cols-3 gap-2">
                {dialPhone ? (
                  <a
                    href={`tel:${dialPhone}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(actedIds[`${report.id}:respond`])}
                    onClick={() => triggerAction(report.id, "respond")}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    I&apos;m Helping
                  </button>
                )}

                {dialPhone ? (
                  <a
                    href={buildWhatsAppUrl(dialPhone, report.title, shareDeepLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-zinc-950 hover:opacity-95"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(report)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-zinc-950 hover:opacity-95"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Forward
                  </button>
                )}

                <a
                  href={buildDirectionsUrl(report.lat, report.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Map
                </a>
              </div>
            )}

            {/* Community Trust & Updates Bar */}
            <div
              className={`mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-[11px] font-semibold ${
                daylight ? "border-zinc-100" : "border-zinc-800"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={Boolean(actedIds[`${report.id}:verify`]) || isResolved}
                  onClick={() => triggerAction(report.id, "verify")}
                  className="inline-flex items-center gap-1 text-emerald-500 hover:underline disabled:opacity-60"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Verified ({report.verifications})
                </button>

                {dialPhone && !isResolved && (
                  <button
                    type="button"
                    disabled={Boolean(actedIds[`${report.id}:respond`])}
                    onClick={() => triggerAction(report.id, "respond")}
                    className="inline-flex items-center gap-1 text-sky-500 hover:underline disabled:opacity-60"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    I&apos;m En Route
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setOpenThreadId(openThreadId === report.id ? null : report.id)
                  }
                  className="inline-flex items-center gap-1 opacity-75 hover:opacity-100"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Updates ({report.updates?.length ?? 0})
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(report)}
                  className="opacity-75 hover:opacity-100"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => handleCopySms(report)}
                  className="opacity-75 hover:opacity-100"
                >
                  {copiedId === report.id ? "Copied!" : "SMS"}
                </button>
                {!isResolved && (
                  <button
                    type="button"
                    onClick={() => triggerAction(report.id, "resolve")}
                    className="inline-flex items-center gap-0.5 text-emerald-500 hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Done
                  </button>
                )}
                <button
                  type="button"
                  title="Flag false or outdated alert"
                  onClick={() => triggerAction(report.id, "flag")}
                  className="opacity-50 hover:text-red-500 hover:opacity-100"
                >
                  <Flag className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Live Status Updates Thread */}
            {openThreadId === report.id && (
              <div
                className={`mt-3 rounded-xl border p-3 text-xs ${
                  daylight
                    ? "border-zinc-200 bg-zinc-50"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                {report.updates && report.updates.length > 0 ? (
                  <div className="mb-2.5 space-y-1.5">
                    {report.updates.map((u) => (
                      <div key={u.id} className="leading-relaxed">
                        <strong className="text-sky-500">{u.author}: </strong>
                        <span>{u.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-2 opacity-60">
                    No field updates yet. Post a live status update below.
                  </p>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={240}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="e.g., 1 unit arranged, road cleared..."
                    className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none ${
                      daylight
                        ? "border-zinc-300 bg-white text-zinc-950"
                        : "border-zinc-700 bg-zinc-900 text-white"
                    }`}
                  />
                  <button
                    type="button"
                    disabled={submittingComment}
                    onClick={() => handleAddComment(report.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
