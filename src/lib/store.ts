import { Redis } from "@upstash/redis";
import type { BeaconReport } from "@/types/beacon";

const REPORTS_SET_KEY = "beaconmesh:active_ids";
const REPORT_KEY_PREFIX = "beaconmesh:report:";

const globalForMemory = globalThis as unknown as {
  __beaconMemoryStore?: Map<string, BeaconReport>;
};
const memoryStore =
  globalForMemory.__beaconMemoryStore ?? new Map<string, BeaconReport>();
globalForMemory.__beaconMemoryStore = memoryStore;

function getRedisCredentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (url && token) {
    return { url, token };
  }
  return null;
}

function getRedisClient(): Redis | null {
  const creds = getRedisCredentials();
  if (!creds) return null;
  return new Redis({ url: creds.url, token: creds.token });
}

export function isPersistentBackend(): boolean {
  return Boolean(getRedisCredentials());
}

export async function saveReport(report: BeaconReport): Promise<void> {
  const redis = getRedisClient();
  const ttlSeconds = Math.max(
    60,
    Math.floor((report.expiresAt - Date.now()) / 1000)
  );

  if (redis) {
    await redis.set(`${REPORT_KEY_PREFIX}${report.id}`, report, {
      ex: ttlSeconds
    });
    await redis.sadd(REPORTS_SET_KEY, report.id);
    return;
  }

  memoryStore.set(report.id, report);
}

export async function listActiveReports(): Promise<BeaconReport[]> {
  const now = Date.now();
  const redis = getRedisClient();

  if (redis) {
    const ids = await redis.smembers(REPORTS_SET_KEY);
    if (!ids || ids.length === 0) return [];

    const keys = ids.map((id) => `${REPORT_KEY_PREFIX}${id}`);
    const records = await redis.mget<(BeaconReport | null)[]>(...keys);

    const active: BeaconReport[] = [];
    const expiredIds: string[] = [];

    records.forEach((rec, idx) => {
      if (!rec || rec.expiresAt <= now) {
        expiredIds.push(ids[idx]);
      } else {
        active.push(rec);
      }
    });

    if (expiredIds.length > 0) {
      await redis.srem(REPORTS_SET_KEY, ...expiredIds);
    }

    return active;
  }

  const active: BeaconReport[] = [];
  for (const [id, report] of memoryStore.entries()) {
    if (report.expiresAt <= now) {
      memoryStore.delete(id);
    } else {
      active.push(report);
    }
  }
  return active;
}

export async function incrementVerification(
  id: string
): Promise<BeaconReport | null> {
  const redis = getRedisClient();

  if (redis) {
    const key = `${REPORT_KEY_PREFIX}${id}`;
    const report = await redis.get<BeaconReport>(key);
    if (!report || report.expiresAt <= Date.now()) return null;

    const updated: BeaconReport = {
      ...report,
      verifications: report.verifications + 1
    };
    const remainingTtl = Math.max(
      60,
      Math.floor((report.expiresAt - Date.now()) / 1000)
    );
    await redis.set(key, updated, { ex: remainingTtl });
    return updated;
  }

  const existing = memoryStore.get(id);
  if (!existing || existing.expiresAt <= Date.now()) return null;
  const updated: BeaconReport = {
    ...existing,
    verifications: existing.verifications + 1
  };
  memoryStore.set(id, updated);
  return updated;
}

export async function markReportResolved(
  id: string
): Promise<BeaconReport | null> {
  const redis = getRedisClient();

  if (redis) {
    const key = `${REPORT_KEY_PREFIX}${id}`;
    const report = await redis.get<BeaconReport>(key);
    if (!report || report.expiresAt <= Date.now()) return null;

    const updated: BeaconReport = {
      ...report,
      resolved: true
    };
    await redis.set(key, updated, { ex: 1800 });
    return updated;
  }

  const existing = memoryStore.get(id);
  if (!existing || existing.expiresAt <= Date.now()) return null;
  const updated: BeaconReport = {
    ...existing,
    resolved: true,
    expiresAt: Math.min(existing.expiresAt, Date.now() + 30 * 60 * 1000)
  };
  memoryStore.set(id, updated);
  return updated;
}
