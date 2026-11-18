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
  Camera,
  X,
  LifeBuoy,
  UserCheck
} from "lucide-react";
import { mineProofOfWork } from "@/lib/pow";
import { enqueueReport } from "@/lib/offlineQueue";
import { compressImageToDataUrl } from "@/lib/imageCompressor";
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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const CATEGORY_OPTIONS: Array<{
  id: ReportCategory;
  label: string;
  icon: typeof HeartPulse;
}> = [
  { id: "blood", label: "Blood Needed", icon: Droplets },
  { id: "medical", label: "Medical / O2", icon: HeartPulse },
  { id: "water_food", label: "Water & Food", icon: Droplets },
  { id: "rescue", label: "Rescue / SOS", icon: LifeBuoy },
  { id: "shelter", label: "Shelter / Power", icon: Home },
  { id: "hazard", label: "Road / Hazard", icon: AlertTriangle },
  { id: "checkin", label: "I Am Safe", icon: UserCheck }
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
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [urgency, setUrgency] = useState<UrgencyLevel>("critical");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [contact, setContact] = useState("");
  const [ttlHours, setTtlHours] = useState(12);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
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

  const surface = daylight
    ? "border-zinc-200 bg-white text-zinc-950"
    : "border-zinc-800 bg-zinc-900 text-zinc-100";

  const inputClass = daylight
    ? "border-zinc-300 bg-zinc-50 text-zinc-950 placeholder-zinc-400 focus:border-red-600"
    : "border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:border-red-500";

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoDataUrl(compressed);
    } catch {
      setErrorMsg("Could not process image.");
    } finally {
      setCompressingPhoto(false);
    }
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
      bloodGroup: category === "blood" ? bloodGroup : undefined,
      urgency,
      title,
      details,
      contact,
      lat: effectiveLat,
      lng: effectiveLng,
      landmark,
      photoDataUrl,
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
      setPhotoDataUrl(undefined);
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
        setErrorMsg(data.error || "Could not broadcast alert.");
      } else {
        setTitle("");
        setDetails("");
        setPhotoDataUrl(undefined);
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
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${surface}`}>
      {/* Subtle Step Indicator */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold opacity-70">
          <span>Step {step} of 3</span>
          <span>
            {step === 1
              ? "Type & Category"
              : step === 2
              ? "Location"
              : "Details & Send"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition ${
                n <= step
                  ? kind === "need"
                    ? "bg-red-600"
                    : kind === "offer"
                    ? "bg-emerald-600"
                    : "bg-sky-600"
                  : daylight
                  ? "bg-zinc-200"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setKind("need");
                setUrgency("critical");
              }}
              className={`rounded-xl border py-3 text-xs sm:text-sm font-bold transition ${
                kind === "need"
                  ? "border-red-600 bg-red-600 text-white"
                  : daylight
                  ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              Need Help
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("offer");
                setUrgency("moderate");
              }}
              className={`rounded-xl border py-3 text-xs sm:text-sm font-bold transition ${
                kind === "offer"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : daylight
                  ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              Offer Aid
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("safe");
                setCategory("checkin");
                setUrgency("moderate");
              }}
              className={`rounded-xl border py-3 text-xs sm:text-sm font-bold transition ${
                kind === "safe"
                  ? "border-sky-600 bg-sky-600 text-white"
                  : daylight
                  ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              I&apos;m Safe
            </button>
          </div>

          <label className="mb-2 block text-xs font-semibold opacity-75">
            Select Category
          </label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((item) => {
              const Icon = item.icon;
              const selected = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.id);
                    if (item.id === "checkin") setKind("safe");
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs sm:text-sm font-semibold transition ${
                    selected
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : daylight
                      ? "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {category === "blood" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold opacity-75">
                Blood Group
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`rounded-lg border py-2 text-xs font-extrabold ${
                      bloodGroup === bg
                        ? "border-red-600 bg-red-600 text-white"
                        : daylight
                        ? "border-zinc-200 bg-zinc-50"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!userCoords) onRequestLocation();
              setStep(2);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-500"
          >
            Next: Set Location
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div
            className={`mb-4 rounded-xl border p-3.5 ${
              hasValidLocation
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {hasValidLocation ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <LocateFixed className="h-5 w-5 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-bold">
                    {hasValidLocation ? "GPS Locked" : "Location Needed"}
                  </p>
                  <p className="truncate text-[11px] opacity-75">
                    {hasValidLocation
                      ? `${effectiveLat.toFixed(4)}, ${effectiveLng.toFixed(4)}`
                      : "Tap Lock GPS so nearby people can find you"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestLocation}
                className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
              >
                {hasValidLocation ? "Refresh" : "Lock GPS"}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-semibold opacity-75">
              Area / Street / Landmark *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g., Near District Hospital Gate 2"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none ${inputClass}`}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="mb-4 text-xs font-medium underline opacity-70 hover:opacity-100"
          >
            {showManualCoords
              ? "Hide manual coordinates"
              : "Enter coordinates manually"}
          </button>

          {showManualCoords && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-xs ${inputClass}`}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-xs ${inputClass}`}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-1 rounded-xl border py-3 text-xs font-bold ${
                daylight ? "border-zinc-300" : "border-zinc-700"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              disabled={!hasValidLocation || !landmark.trim()}
              onClick={() => setStep(3)}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-40"
            >
              Next: Details
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold opacity-75">
              {kind === "safe"
                ? "Your Name & Status *"
                : kind === "need"
                ? "What is urgently needed? *"
                : "What aid are you offering? *"}
            </label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder={
                kind === "safe"
                  ? "e.g., Zeeshan & family safe at Ward 4"
                  : kind === "need"
                  ? "e.g., Need 2 units O+ blood at City Hospital"
                  : "e.g., Clean drinking water & power bank charging"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none ${inputClass}`}
            />
          </div>

          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold opacity-75">
                Phone / WhatsApp
              </label>
              <input
                type="tel"
                maxLength={100}
                placeholder="+91 98765 43210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${inputClass}`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold opacity-75">
                Auto-Expire
              </label>
              <select
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${inputClass}`}
              >
                <option value={3}>3 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Extra details (hospital ward, road condition, patient age)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${inputClass}`}
            />
          </div>

          {/* Compressed Photo Upload */}
          <div className="mb-4">
            {photoDataUrl ? (
              <div className="relative inline-block">
                <img
                  src={photoDataUrl}
                  alt="Attached preview"
                  className="h-20 w-28 rounded-xl border border-zinc-700 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(undefined)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  daylight
                    ? "border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <Camera className="h-4 w-4 text-red-500" />
                <span>
                  {compressingPhoto
                    ? "Compressing for 2G..."
                    : "Attach Photo Proof (Optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {errorMsg && (
            <p className="mb-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-400">
              {errorMsg}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center justify-center gap-1 rounded-xl border py-3.5 text-xs font-bold ${
                daylight ? "border-zinc-300" : "border-zinc-700"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={status !== "idle" || compressingPhoto}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-extrabold text-white shadow hover:bg-red-500 disabled:opacity-50"
            >
              {status !== "idle" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Broadcast Alert
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
