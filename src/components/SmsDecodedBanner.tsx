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
    <div className="mb-3 rounded-2xl border border-sky-500/50 bg-sky-950/90 p-3.5 text-xs text-sky-50 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <div>
            <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-200">
              SMS Offline Relay ({decoded.kind})
            </span>
            <h3 className="mt-1 text-sm font-bold text-white">{decoded.title}</h3>
            <p className="mt-0.5 text-sky-200">
              {decoded.landmark}
              {decoded.contact ? ` • ${decoded.contact}` : ""}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dialPhone && (
                <a
                  href={`tel:${dialPhone}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-zinc-950"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call
                </a>
              )}
              <a
                href={buildDirectionsUrl(decoded.lat, decoded.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-sky-400 px-3 py-1.5 font-bold text-zinc-950"
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
          className="rounded-lg p-1 text-sky-300 hover:bg-sky-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
