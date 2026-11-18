"use client";

import { useEffect, useState } from "react";
import { MessageSquareWarning, Navigation, PhoneCall, X } from "lucide-react";
import { decodeCompactBeacon } from "@/lib/compactEncoder";
import { buildDirectionsUrl, extractDialablePhone } from "@/lib/geo";
import type { DecodedCompactBeacon } from "@/types/beacon";

export function SmsDecodedBanner() {
  const [decoded, setDecoded] = useState<DecodedCompactBeacon | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawCode = params.get("b");
    if (rawCode) {
      const parsed = decodeCompactBeacon(rawCode);
      if (parsed) setDecoded(parsed);
    }
  }, []);

  if (!decoded) return null;
  const dialPhone = extractDialablePhone(decoded.contact);

  return (
    <div className="mb-4 rounded-2xl border-2 border-sky-500 bg-sky-950 p-4 text-sm text-sky-50 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          <div>
            <span className="rounded bg-sky-500/25 px-2 py-0.5 text-xs font-bold uppercase text-sky-200">
              SMS Relay Alert ({decoded.kind})
            </span>
            <h3 className="mt-1.5 text-base font-bold text-white">
              {decoded.title}
            </h3>
            <p className="mt-0.5 text-xs text-sky-200">
              Location: <strong>{decoded.landmark}</strong>
              {decoded.contact ? ` • ${decoded.contact}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dialPhone && (
                <a
                  href={`tel:${dialPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call Now
                </a>
              )}
              <a
                href={buildDirectionsUrl(decoded.lat, decoded.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-sky-300"
              >
                <Navigation className="h-3.5 w-3.5" />
                Directions
              </a>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDecoded(null)}
          aria-label="Dismiss SMS alert"
          className="rounded-lg p-1.5 text-sky-200 hover:bg-sky-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
