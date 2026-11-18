"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Download, X, Compass, ShieldAlert, Wifi } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function OnboardingGuide() {
  const [open, setOpen] = useState(true);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("beaconmesh_guide_hidden");
    if (dismissed === "1") setOpen(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function toggleGuide(nextState: boolean) {
    setOpen(nextState);
    localStorage.setItem("beaconmesh_guide_hidden", nextState ? "0" : "1");
  }

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => toggleGuide(!open)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          <HelpCircle className="h-3.5 w-3.5 text-red-400" />
          {open ? "Hide Quick Guide" : "How BeaconMesh Works (10-Sec Guide)"}
        </button>

        {installPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/20 border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-600/30"
          >
            <Download className="h-3.5 w-3.5" />
            Install Offline App
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              How This Emergency Ledger Connects Neighbors
            </span>
            <button
              type="button"
              onClick={() => toggleGuide(false)}
              aria-label="Close guide"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-xs text-zinc-300">
            <div className="rounded-xl bg-zinc-950/80 p-3 border border-zinc-800/80">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
                <Compass className="h-3.5 w-3.5 text-red-400" />
                1. Lock GPS or Tap Preset
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Broadcast a urgent need (water, blood, shelter) or offer spare
                supplies without creating an account.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950/80 p-3 border border-zinc-800/80">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
                <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                2. Vouch & Navigate
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Neighbors confirm alerts on-ground to filter rumors, open Google
                Maps directions, and mark needs resolved.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950/80 p-3 border border-zinc-800/80">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
                <Wifi className="h-3.5 w-3.5 text-amber-400" />
                3. Blackout & SMS Ready
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Works offline when cell towers fail—auto-syncing on reconnect
                or copying tiny SMS links for low-signal forwarding.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
