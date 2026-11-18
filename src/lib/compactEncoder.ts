import type {
  BeaconReport,
  DecodedCompactBeacon,
  ReportCategory,
  UrgencyLevel
} from "@/types/beacon";

const VALID_CATEGORIES: ReportCategory[] = [
  "medical",
  "water_food",
  "shelter",
  "hazard"
];
const VALID_URGENCIES: UrgencyLevel[] = ["critical", "high", "moderate"];

export function encodeCompactBeacon(report: BeaconReport): string {
  const compact = [
    report.kind === "need" ? "N" : "O",
    report.category,
    report.urgency,
    report.title,
    report.landmark,
    report.contact,
    report.lat.toFixed(4),
    report.lng.toFixed(4)
  ].join("|");

  if (typeof window !== "undefined") {
    return btoa(encodeURIComponent(compact));
  }
  return Buffer.from(encodeURIComponent(compact), "utf-8").toString("base64");
}

export function decodeCompactBeacon(encoded: string): DecodedCompactBeacon | null {
  try {
    const raw =
      typeof window !== "undefined"
        ? decodeURIComponent(atob(encoded))
        : decodeURIComponent(Buffer.from(encoded, "base64").toString("utf-8"));
    const parts = raw.split("|");
    if (parts.length < 8) return null;

    const [kindCode, categoryRaw, urgencyRaw, title, landmark, contact, latRaw, lngRaw] =
      parts;
    const category = VALID_CATEGORIES.includes(categoryRaw as ReportCategory)
      ? (categoryRaw as ReportCategory)
      : "hazard";
    const urgency = VALID_URGENCIES.includes(urgencyRaw as UrgencyLevel)
      ? (urgencyRaw as UrgencyLevel)
      : "high";
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!title || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      kind: kindCode === "O" ? "offer" : "need",
      category,
      urgency,
      title,
      landmark: landmark || "Shared via SMS",
      contact: contact || "",
      lat,
      lng
    };
  } catch {
    return null;
  }
}

export function formatSmsFallbackText(report: BeaconReport, originUrl: string): string {
  const tag = report.kind === "need" ? "[NEED]" : "[OFFER]";
  const code = encodeCompactBeacon(report);
  return `${tag} ${report.title} (${report.category.toUpperCase()}) @ ${report.landmark} (${report.lat.toFixed(4)},${report.lng.toFixed(4)}). Contact: ${report.contact || "On-site"}. Ledger: ${originUrl}/?b=${encodeURIComponent(code)}`;
}
