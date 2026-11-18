export type ReportKind = "need" | "offer";

export type ReportCategory =
  | "medical"
  | "water_food"
  | "shelter"
  | "hazard";

export type UrgencyLevel = "critical" | "high" | "moderate";

export interface BeaconReport {
  id: string;
  kind: ReportKind;
  category: ReportCategory;
  urgency: UrgencyLevel;
  title: string;
  details: string;
  contact: string;
  lat: number;
  lng: number;
  landmark: string;
  createdAt: number;
  expiresAt: number;
  verifications: number;
  powNonce: string;
  powHash: string;
  distanceKm?: number;
}

export interface CreateReportPayload {
  kind: ReportKind;
  category: ReportCategory;
  urgency: UrgencyLevel;
  title: string;
  details: string;
  contact: string;
  lat: number;
  lng: number;
  landmark: string;
  ttlHours: number;
  powNonce: string;
  powTimestamp: number;
}
