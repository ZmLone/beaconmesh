"use client";

import { useState } from "react";
import {
  LocateFixed,
  Send,
  Loader2,
  HeartPulse,
  Droplets,
  Home,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock
} from "lucide-react";
import { mineProofOfWork } from "@/lib/pow";
import { enqueueReport } from "@/lib/offlineQueue";
import type {
  CreateReportPayload,
  ReportCategory,
  ReportKind,
  UrgencyLevel
} from "@/types/beacon";

interface ReportFormProps {
  daylight: boolean;
  userCoords: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onCreated: () => void;
}

const CATEGORY_TILES: Array<{
  id: ReportCategory;
  label: string;
  sub: string;
  icon: typeof HeartPulse;
}> = [
  {
    id: "medical",
    label: "Medical / Blood",
    sub: "First aid, insulin, donor",
    icon: HeartPulse
  },
  {
    id: "water_food",
    label: "Water & Food",
    sub: "Drinking water, rations",
    icon: Droplets
  },
  {
    id: "shelter",
    label: "Shelter & Power",
    sub: "Dry room, phone charging",
    icon: Home
  },
  {
    id: "hazard",
    label: "Road / Hazard",
    sub: "Blocked route, flood, wire",
    icon: AlertTriangle
  }
];

export function ReportForm({
  daylight,
  userCoords,
  onRequestLocation,
  onCreated
}: ReportFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<ReportKind>("need");
  const [category, setCategory] = useState<ReportCategory>("medical");
  const [urgency, setUrgency] = useState<UrgencyLevel>("critical");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [contact, setContact] = useState("");
  const [ttlHours, setTtlHours] = useState(12);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [status, setStatus] = useState<"idle" | "mining" | "submitting">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveLat = userCoords ? userCoords.lat : Number(manualLat);
  const effectiveLng = userCoords ? userCoords.lng : Number(manualLng);
  const hasValidLocation =
    Number.isFinite(effectiveLat) &&
    Number.isFinite(effectiveLng) &&
    !(effectiveLat === 0 && effectiveLng === 0);

  const cardClass = daylight
    ? "border-zinc-300 bg-white text-zinc-950"
    : "border-zinc-800 bg-zinc-900 text-zinc-100";

  const inputClass = daylight
    ? "border-zinc-300 bg-zinc-50 text-zinc-950 placeholder-zinc-500 focus:border-red-600"
    : "border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:border-red-500";

  function goToStep2() {
    if (!userCoords) {
      onRequestLocation();
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasValidLocation) {
      setErrorMsg("Please lock your GPS location first.");
      setStep(2);
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
      setStep(1);
      onCreated();
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
        setErrorMsg(data.error || "Could not send alert.");
      } else {
        setTitle("");
        setDetails("");
        setStep(1);
        onCreated();
      }
    } catch {
      enqueueReport(payload);
      setStep(1);
      onCreated();
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className={`mx-auto max-w-xl rounded-2xl border-2 p-5 shadow-lg ${cardClass}`}>
      {/* Progress Bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-75">
          <span>Step {step} of 3</span>
          <span>
            {step === 1
              ? "What Happened?"
              : step === 2
              ? "Confirm Location"
              : "Send Alert"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 rounded-full transition ${
                n <= step
                  ? kind === "need"
                    ? "bg-red-600"
                    : "bg-emerald-600"
                  : daylight
                  ? "bg-zinc-200"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Need vs Offer + 4 Big Tiles */}
      {step === 1 && (
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider opacity-75">
            1. Choose Action
          </label>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setKind("need");
                setUrgency("critical");
              }}
              className={`rounded-2xl border-2 py-4 text-center text-base font-extrabold transition ${
                kind === "need"
                  ? "border-red-600 bg-red-600 text-white shadow-md"
                  : daylight
                  ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              I Need Help
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("offer");
                setUrgency("moderate");
              }}
              className={`rounded-2xl border-2 py-4 text-center text-base font-extrabold transition ${
                kind === "offer"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                  : daylight
                  ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              I Can Help
            </button>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider opacity-75">
            2. Select Category
          </label>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {CATEGORY_TILES.map((tile) => {
              const Icon = tile.icon;
              const active = category === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setCategory(tile.id)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition ${
                    active
                      ? kind === "need"
                        ? "border-red-600 bg-red-600/10"
                        : "border-emerald-600 bg-emerald-600/10"
                      : daylight
                      ? "border-zinc-200 bg-zinc-50 hover:border-zinc-400"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <Icon
                    className={`mb-2 h-6 w-6 ${
                      active
                        ? kind === "need"
                          ? "text-red-500"
                          : "text-emerald-500"
                        : "opacity-70"
                    }`}
                  />
                  <span className="text-sm font-bold">{tile.label}</span>
                  <span className="mt-0.5 text-xs opacity-70">{tile.sub}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToStep2}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-bold text-white shadow hover:bg-red-500"
          >
            Continue to Location
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* STEP 2: Auto-GPS Lock */}
      {step === 2 && (
        <div>
          <div
            className={`mb-4 rounded-2xl border-2 p-4 ${
              hasValidLocation
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-amber-500/60 bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {hasValidLocation ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                ) : (
                  <LocateFixed className="h-6 w-6 shrink-0 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-bold">
                    {hasValidLocation
                      ? "GPS Location Locked"
                      : "Waiting for Phone GPS"}
                  </p>
                  <p className="text-xs opacity-75">
                    {hasValidLocation
                      ? `Coordinates: ${effectiveLat.toFixed(4)}, ${effectiveLng.toFixed(4)}`
                      : "Tap Lock My GPS below so nearby helpers can find you."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestLocation}
                className="rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
              >
                {hasValidLocation ? "Refresh GPS" : "Lock My GPS"}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider opacity-75">
              Street, Village, or Nearby Landmark *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g., Near Main Mosque, Ward 4 Bridge"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className={`w-full rounded-xl border-2 px-3.5 py-3 text-base focus:outline-none ${inputClass}`}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="mb-5 text-xs font-semibold underline opacity-75 hover:opacity-100"
          >
            {showManualCoords
              ? "Hide manual coordinates"
              : "GPS blocked? Enter coordinates manually"}
          </button>

          {showManualCoords && (
            <div className="mb-5 grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 34.0837)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm ${inputClass}`}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 74.7973)"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm ${inputClass}`}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-1 rounded-2xl border-2 py-3.5 text-sm font-bold ${
                daylight
                  ? "border-zinc-300 text-zinc-800"
                  : "border-zinc-700 text-zinc-200"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              disabled={!hasValidLocation || !landmark.trim()}
              onClick={() => setStep(3)}
              className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white shadow hover:bg-red-500 disabled:opacity-40"
            >
              Next: Details
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Short Headline + Phone + Send */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider opacity-75">
              {kind === "need"
                ? "What is urgently needed? *"
                : "What help can you provide? *"}
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder={
                kind === "need"
                  ? "e.g., Need O+ blood donor or insulin immediately"
                  : "e.g., Free drinking water & solar phone charging"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-xl border-2 px-3.5 py-3 text-base focus:outline-none ${inputClass}`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider opacity-75">
              Phone Number (Enables One-Tap Call)
            </label>
            <input
              type="tel"
              maxLength={100}
              placeholder="e.g., +91 98765 43210 or On-site"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={`w-full rounded-xl border-2 px-3.5 py-3 text-base focus:outline-none ${inputClass}`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider opacity-75">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "critical", label: "Critical (SOS)" },
                  { id: "high", label: "Urgent" },
                  { id: "moderate", label: "Standard" }
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  className={`rounded-xl border-2 py-2.5 text-xs font-bold transition ${
                    urgency === u.id
                      ? "border-red-600 bg-red-600 text-white"
                      : daylight
                      ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Extra notes (quantities, road conditions, patient details)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-sm focus:outline-none ${inputClass}`}
            />
          </div>

          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowExpiry(!showExpiry)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-75 hover:opacity-100"
            >
              <Clock className="h-3.5 w-3.5" />
              Auto-remove after {ttlHours} hours (Change)
            </button>
            {showExpiry && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[3, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTtlHours(h)}
                    className={`rounded-lg border py-1.5 text-xs font-bold ${
                      ttlHours === h
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-zinc-700 opacity-75"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="mb-4 rounded-xl bg-red-600/20 px-3 py-2 text-xs font-semibold text-red-400">
              {errorMsg}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center justify-center gap-1 rounded-2xl border-2 py-4 text-sm font-bold ${
                daylight
                  ? "border-zinc-300 text-zinc-800"
                  : "border-zinc-700 text-zinc-200"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={status !== "idle"}
              className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-extrabold text-white shadow-lg hover:bg-red-500 disabled:opacity-60"
            >
              {status !== "idle" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Broadcast Now
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
