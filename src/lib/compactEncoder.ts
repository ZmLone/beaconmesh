import type { BeaconReport } from "@/types/beacon";

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

export function formatSmsFallbackText(report: BeaconReport, originUrl: string): string {
  const tag = report.kind === "need" ? "[NEED]" : "[OFFER]";
  const code = encodeCompactBeacon(report);
  return `${tag} ${report.title} (${report.category.toUpperCase()}) @ ${report.landmark} (${report.lat.toFixed(4)},${report.lng.toFixed(4)}). Contact: ${report.contact || "On-site"}. Ledger: ${originUrl}/?b=${encodeURIComponent(code)}`;
}
