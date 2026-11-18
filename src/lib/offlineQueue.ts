import type { CreateReportPayload } from "@/types/beacon";

const QUEUE_KEY = "beaconmesh_offline_outbox_v2";

export function getQueuedReports(): CreateReportPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as CreateReportPayload[]) : [];
  } catch {
    return [];
  }
}

export function enqueueReport(payload: CreateReportPayload): void {
  if (typeof window === "undefined") return;
  const current = getQueuedReports();
  current.push(payload);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
}

export async function flushOfflineQueue(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0;
  const queue = getQueuedReports();
  if (queue.length === 0) return 0;

  const remaining: CreateReportPayload[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok || res.status === 400) {
        if (res.ok) syncedCount++;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return syncedCount;
}
