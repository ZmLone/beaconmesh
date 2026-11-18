import type {
  BeaconReport,
  DecodedCompactBeacon,
  ReportCategory,
  UrgencyLevel
} from "@/types/beacon";

const VALID_CATEGORIES: ReportCategory[] = [
  "blood",
  "medical",
  "water_food",
  "rescue",
  "shelter",
  "hazard",
  "checkin"
];
const VALID_URGENCIES: UrgencyLevel[] = ["critical", "high", "moderate"];

export function encodeCompactBeacon(report: BeaconReport): string {
  const compact = [
    report.kind === "need" ? "N" : report.kind === "offer" ? "O" : "S",
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
      kind: kindCode === "O" ? "offer" : kindCode === "S" ? "safe" : "need",
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

export function formatWhatsAppShareText(report: BeaconReport, originUrl: string): string {
  const prefix =
    report.kind === "need"
      ? "🚨 *URGENT HELP NEEDED*"
      : report.kind === "offer"
      ? "🤝 *AID / RESOURCE AVAILABLE*"
      : "✅ *SAFE CHECK-IN*";
  const bloodTag = report.bloodGroup ? ` [Blood: ${report.bloodGroup}]` : "";
  const deepLink = `${originUrl}/?alert=${encodeURIComponent(report.id)}`;
  return `${prefix}${bloodTag}
*${report.title}*
📍 Location: ${report.landmark}
📞 Contact: ${report.contact || "On-site"}
🗺️ Map: https://maps.google.com/?q=${report.lat},${report.lng}
🔗 Open & Respond on BeaconMesh: ${deepLink}`;
}

export function formatSmsFallbackText(report: BeaconReport, originUrl: string): string {
  const tag =
    report.kind === "need"
      ? "[NEED]"
      : report.kind === "offer"
      ? "[OFFER]"
      : "[SAFE]";
  const code = encodeCompactBeacon(report);
  return `${tag} ${report.title} @ ${report.landmark} (${report.lat.toFixed(4)},${report.lng.toFixed(4)}). Tel: ${report.contact || "On-site"}. Link: ${originUrl}/?b=${encodeURIComponent(code)}`;
}
