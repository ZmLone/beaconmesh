import { NextRequest, NextResponse } from "next/server";
import { haversineKm, isValidCoordinate } from "@/lib/geo";
import { verifyProofOfWork } from "@/lib/pow";
import {
  isPersistentBackend,
  listActiveReports,
  saveReport
} from "@/lib/store";
import type {
  BeaconReport,
  CreateReportPayload,
  ReportCategory,
  ReportKind,
  UrgencyLevel
} from "@/types/beacon";

const VALID_KINDS: ReportKind[] = ["need", "offer", "safe"];
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
const MAX_PHOTO_DATA_URL_LEN = 180_000; // ~130 KB compressed JPEG cap

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusKm = Math.min(
    500,
    Math.max(1, Number(searchParams.get("radiusKm") || 50))
  );
  const kindFilter = searchParams.get("kind");
  const categoryFilter = searchParams.get("category");
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();

  const hasUserCoords =
    latParam !== null &&
    lngParam !== null &&
    isValidCoordinate(Number(latParam), Number(lngParam));

  const userLat = hasUserCoords ? Number(latParam) : 0;
  const userLng = hasUserCoords ? Number(lngParam) : 0;

  let reports = await listActiveReports();

  if (kindFilter && kindFilter !== "all") {
    reports = reports.filter((r) => r.kind === kindFilter);
  }
  if (categoryFilter && categoryFilter !== "all") {
    reports = reports.filter((r) => r.category === categoryFilter);
  }
  if (searchQuery) {
    reports = reports.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery) ||
        r.landmark.toLowerCase().includes(searchQuery) ||
        r.details.toLowerCase().includes(searchQuery) ||
        (r.bloodGroup && r.bloodGroup.toLowerCase().includes(searchQuery))
    );
  }

  if (hasUserCoords) {
    reports = reports
      .map((r) => ({
        ...r,
        distanceKm: haversineKm(userLat, userLng, r.lat, r.lng)
      }))
      .filter((r) => (r.distanceKm ?? 0) <= radiusKm)
      .sort((a, b) => {
        if (Boolean(a.resolved) !== Boolean(b.resolved)) {
          return a.resolved ? 1 : -1;
        }
        if (b.verifications !== a.verifications) {
          return b.verifications - a.verifications;
        }
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      });
  } else {
    reports.sort((a, b) => {
      if (Boolean(a.resolved) !== Boolean(b.resolved)) {
        return a.resolved ? 1 : -1;
      }
      if (b.verifications !== a.verifications) {
        return b.verifications - a.verifications;
      }
      return b.createdAt - a.createdAt;
    });
  }

  return NextResponse.json({
    reports,
    persistent: isPersistentBackend()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateReportPayload>;

    if (
      !body.kind ||
      !VALID_KINDS.includes(body.kind) ||
      !body.category ||
      !VALID_CATEGORIES.includes(body.category) ||
      !body.urgency ||
      !VALID_URGENCIES.includes(body.urgency)
    ) {
      return NextResponse.json(
        { error: "Invalid report classification." },
        { status: 400 }
      );
    }

    const title = String(body.title ?? "").trim().slice(0, 120);
    const details = String(body.details ?? "").trim().slice(0, 500);
    const contact = String(body.contact ?? "").trim().slice(0, 100);
    const landmark = String(body.landmark ?? "").trim().slice(0, 120);
    const bloodGroup = body.bloodGroup
      ? String(body.bloodGroup).trim().slice(0, 10)
      : undefined;
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const ttlHours = Math.min(72, Math.max(1, Number(body.ttlHours ?? 12)));

    let photoDataUrl: string | undefined;
    if (
      typeof body.photoDataUrl === "string" &&
      body.photoDataUrl.startsWith("data:image/jpeg;base64,") &&
      body.photoDataUrl.length <= MAX_PHOTO_DATA_URL_LEN
    ) {
      photoDataUrl = body.photoDataUrl;
    }

    if (!title || !landmark || !isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        { error: "Headline, landmark, and valid GPS coordinates are required." },
        { status: 400 }
      );
    }

    const powCheck = await verifyProofOfWork(
      title,
      lat,
      lng,
      Number(body.powTimestamp),
      String(body.powNonce ?? "")
    );

    if (!powCheck.valid) {
      return NextResponse.json(
        { error: "Anti-spam verification failed. Please retry." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const report: BeaconReport = {
      id: crypto.randomUUID(),
      kind: body.kind,
      category: body.category,
      bloodGroup,
      urgency: body.urgency,
      title,
      details,
      contact,
      lat,
      lng,
      landmark,
      photoDataUrl,
      createdAt: now,
      expiresAt: now + ttlHours * 60 * 60 * 1000,
      verifications: 1,
      respondersCount: 0,
      flagsCount: 0,
      resolved: false,
      updates: [],
      powNonce: String(body.powNonce),
      powHash: powCheck.hash
    };

    await saveReport(report);

    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Malformed request payload." },
      { status: 400 }
    );
  }
}
