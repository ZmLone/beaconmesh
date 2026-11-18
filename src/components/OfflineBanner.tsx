"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { flushOfflineQueue, getQueuedReports } from "@/lib/offlineQueue";

interface OfflineBannerProps {
  onSynced: () => void;
}

export function OfflineBanner({ onSynced }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueuedCount(getQueuedReports().length);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleSync = async () => {
      setIsOnline(true);
      const count = await flushOfflineQueue();
      setQueuedCount(getQueuedReports().length);
      if (count > 0) {
        setSyncMessage(`Synced ${count} offline alert(s) to the live feed.`);
        onSynced();
        setTimeout(() => setSyncMessage(null), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQueuedCount(getQueuedReports().length);
    };

    window.addEventListener("online", handleSync);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleSync);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onSynced]);

  if (isOnline && queuedCount === 0 && !syncMessage) return null;

  return (
    <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-950/90 px-3.5 py-2.5 text-xs font-medium text-amber-100 shadow-sm">
      {!isOnline ? (
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Offline Mode ({queuedCount} queued) — Alerts save locally and
            auto-send when signal returns.
          </span>
        </div>
      ) : syncMessage ? (
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span>{queuedCount} offline alert(s) ready to sync.</span>
          <button
            type="button"
            onClick={async () => {
              await flushOfflineQueue();
              setQueuedCount(getQueuedReports().length);
              onSynced();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-zinc-950"
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </button>
        </div>
      )}
    </div>
  );
}
