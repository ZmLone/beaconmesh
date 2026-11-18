export type ReportKind = "need" | "offer" | "safe";

export type ReportCategory =
  | "blood"
  | "medical"
  | "water_food"
  | "rescue"
  | "shelter"
  | "hazard"
  | "checkin";

export type UrgencyLevel = "critical" | "high" | "moderate";

export interface ReportUpdate {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface BeaconReport {
  id: string;
  kind: ReportKind;
  category: ReportCategory;
  bloodGroup?: string;
  urgency: UrgencyLevel;
  title: string;
  details: string;
  contact: string;
  lat: number;
  lng: number;
  landmark: string;
  photoDataUrl?: string;
  createdAt: number;
  expiresAt: number;
  verifications: number;
  respondersCount: number;
  flagsCount: number;
  resolved?: boolean;
  updates: ReportUpdate[];
  powNonce: string;
  powHash: string;
  distanceKm?: number;
}

export interface DecodedCompactBeacon {
  kind: ReportKind;
  category: ReportCategory;
  urgency: UrgencyLevel;
  title: string;
  landmark: string;
  contact: string;
  lat: number;
  lng: number;
}

export interface CreateReportPayload {
  kind: ReportKind;
  category: ReportCategory;
  bloodGroup?: string;
  urgency: UrgencyLevel;
  title: string;
  details: string;
  contact: string;
  lat: number;
  lng: number;
  landmark: string;
  photoDataUrl?: string;
  ttlHours: number;
  powNonce: string;
  powTimestamp: number;
}
