"use client";

import { useState } from "react";
import { LocateFixed, ShieldCheck, Send, Loader2, Zap } from "lucide-react";
import { mineProofOfWork } from "@/lib/pow";
import { enqueueReport } from "@/lib/offlineQueue";
import type {
  CreateReportPayload,
  ReportCategory,
  ReportKind,
  UrgencyLevel
} from "@/types/beacon";

interface ReportFormProps {
  userCoords: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onCreated: () => void;
}

const QUICK_PRESETS: Array<{
  label: string;
  kind: ReportKind;
  category: ReportCategory;
  urgency: UrgencyLevel;
  title: string;
}> = [
  {
    label: "Need Drinking Water",
    kind: "need",
    category: "water_food",
    urgency: "high",
    title: "Urgent: Need clean drinking water & basic rations"
  },
  {
    label: "Medical / Blood Urgent",
    kind: "need",
    category: "medical",
    urgency: "critical",
    title: "Critical: Need urgent medical assistance / blood donor"
  },
  {
    label: "Road Blocked",
    kind: "need",
    category: "hazard",
    urgency: "high",
    title: "Hazard Alert: Main access road blocked / unsafe to pass"
  },
  {
    label: "Free Charging & Shelter",
    kind: "offer",
    category: "shelter",
    urgency: "moderate",
    title: "Offer: Backup power charging & dry shelter available"
  }
];

export function ReportForm({
  userCoords,
  onRequestLocation,
  onCreated
}: ReportFormProps) {
  const [kind, setKind] = useState<ReportKind>("need");
  const [category, setCategory] = useState<ReportCategory>("water_food");
  const [urgency, setUrgency] = useState<UrgencyLevel>("high");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [contact, setContact] = useState("");
  const [ttlHours, setTtlHours] = useState(12);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [status, setStatus] = useState<"idle" | "mining" | "submitting">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveLat = userCoords ? userCoords.lat : Number(manualLat);
  const effectiveLng = userCoords ? userCoords.lng : Number(manualLng);

  function applyPreset(preset: (typeof QUICK_PRESETS)[number]) {
    setKind(preset.kind);
    setCategory(preset.category);
    setUrgency(preset.urgency);
    setTitle(preset.title);
    if (!userCoords) {
      onRequestLocation();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (
      !Number.isFinite(effectiveLat) ||
      !Number.isFinite(effectiveLng) ||
      (effectiveLat === 0 && effectiveLng === 0)
    ) {
      setFeedback("Please lock your GPS location or enter valid coordinates.");
      return;
    }

    setStatus("mining");
    const powTimestamp = Date.now();
    const { nonce } = await mineProofOfWork(
      title,
      effectiveLat,
      effectiveLng,
      powTimestamp
    );

    const payload: CreateReportPayload = {
      kind,
      category,
      urgency,
      title,
      details,
      contact,
      lat: effectiveLat,
      lng: effectiveLng,
      landmark,
      ttlHours,
      powNonce: nonce,
      powTimestamp
    };

    setStatus("submitting");

    if (!navigator.onLine) {
      enqueueReport(payload);
      setStatus("idle");
      setTitle("");
      setDetails("");
      setFeedback("Saved to Offline Outbox. Will auto-sync when online.");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Failed to broadcast report.");
      } else {
        setTitle("");
        setDetails("");
        setFeedback("Broadcasted to live neighborhood ledger.");
        onCreated();
      }
    } catch {
      enqueueReport(payload);
      setFeedback("Network unreachable—queued locally for automatic retry.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Broadcast Field Report
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          PoW Anti-Spam
        </span>
      </div>

      {/* One-Tap Emergency Presets */}
      <div className="mb-4">
        <span className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          <Zap className="h-3 w-3 text-amber-400" />
          Quick-Tap Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-lg border border-zinc-700/80 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-red-500/60 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Need vs Offer Toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setKind("need")}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            kind === "need"
              ? "bg-red-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Request Help (Need)
        </button>
        <button
          type="button"
          onClick={() => setKind("offer")}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            kind === "offer"
              ? "bg-emerald-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Offer Resource / Aid
        </button>
      </div>

      {/* Category & Urgency */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          >
            <option value="medical">Medical / Blood / First Aid</option>
            <option value="water_food">Clean Water & Food</option>
            <option value="shelter">Shelter / Power / Charging</option>
            <option value="hazard">Road Blockage / Hazard</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          >
            <option value="critical">Critical (Immediate)</option>
            <option value="high">High (Within Hours)</option>
            <option value="moderate">Moderate (Ongoing)</option>
          </select>
        </div>
      </div>

      {/* Headline */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">
          Short Headline *
        </label>
        <input
          type="text"
          required
          maxLength={120}
          placeholder={
            kind === "need"
              ? "e.g., Need O-negative blood or insulin near Main Bazaar"
              : "e.g., Solar generator charging & drinking water available"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Landmark & GPS */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">
          Neighborhood / Exact Landmark *
        </label>
        <input
          type="text"
          required
          maxLength={120}
          placeholder="e.g., Ward 4 Community Hall, opposite old bridge"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-400">
            {userCoords
              ? `GPS Locked: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
              : "GPS not locked yet"}
          </span>
          <button
            type="button"
            onClick={onRequestLocation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            <LocateFixed className="h-3.5 w-3.5 text-red-400" />
            Lock GPS
          </button>
        </div>
        {!userCoords && (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude (e.g. 34.0837)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude (e.g. 74.7973)"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200"
            />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">
          Specific Quantities / Situation Notes
        </label>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Quantities needed, access route notes, or medical constraints..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Contact & Auto-Expiry */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Contact / Radio / Phone
          </label>
          <input
            type="text"
            maxLength={100}
            placeholder="Phone, WhatsApp, or on-site"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Auto-Expire After
          </label>
          <select
            value={ttlHours}
            onChange={(e) => setTtlHours(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          >
            <option value={3}>3 Hours</option>
            <option value={12}>12 Hours</option>
            <option value={24}>24 Hours</option>
            <option value={48}>48 Hours</option>
          </select>
        </div>
      </div>

      {feedback && (
        <p className="mb-3 rounded-lg bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={status !== "idle"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
      >
        {status === "mining" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Anti-Spam Proof...
          </>
        ) : status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Broadcasting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Broadcast to Ledger
          </>
        )}
      </button>
    </form>
  );
}
