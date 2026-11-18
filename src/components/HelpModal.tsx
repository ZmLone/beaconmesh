"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Download, X, Compass, ShieldCheck, Wifi } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface HelpModalProps {
  daylight: boolean;
}

export function HelpModal({ daylight }: HelpModalProps) {
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-red-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="How BeaconMesh works"
          title="How BeaconMesh works"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold transition ${
            daylight
              ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
              daylight
                ? "border-zinc-300 bg-white text-zinc-950"
                : "border-zinc-800 bg-zinc-900 text-zinc-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">
                How BeaconMesh Works (10 Seconds)
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">1. Post Without Login</p>
                  <p className="text-xs opacity-75">
                    Tap <strong>+ Post Alert</strong> to request water, blood,
                    medical help, or offer spare shelter and charging nearby.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-semibold">2. Confirm & Navigate</p>
                  <p className="text-xs opacity-75">
                    Neighbors tap <strong>Confirm On-Ground</strong> to verify
                    real emergencies, call directly, or open Google Maps.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">3. Works in Blackouts</p>
                  <p className="text-xs opacity-75">
                    Saves alerts offline when signal drops and copies tiny
                    SMS links for low-bandwidth forwarding.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
