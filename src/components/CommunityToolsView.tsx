"use client";

import { useEffect, useState } from "react";
import { QrCode, Printer, Download, Share2, Check } from "lucide-react";
import QRCode from "qrcode";

interface CommunityToolsViewProps {
  daylight: boolean;
  userCoords: { lat: number; lng: number } | null;
}

export function CommunityToolsView({
  daylight,
  userCoords
}: CommunityToolsViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [areaName, setAreaName] = useState("Our Neighborhood");
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? window.location.origin : "https://beaconmesh.vercel.app";

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" }
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [shareUrl]);

  async function handleCopySiteLink() {
    try {
      await navigator.clipboard.writeText(
        `🚨 Save this link for emergencies & blood/water help in ${areaName}: ${shareUrl}`
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-5 ${
          daylight
            ? "border-zinc-200 bg-white text-zinc-950"
            : "border-zinc-800 bg-zinc-900 text-zinc-100"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <QrCode className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-bold">
            Neighborhood Emergency QR Poster
          </h2>
        </div>
        <p className="mt-1 text-xs opacity-75">
          Print or share this QR card for your local mosque, temple, pharmacy,
          apartment lobby, or community hall so neighbors can access live alerts
          instantly during a crisis.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold opacity-75">
            Neighborhood / Village / Ward Name
          </label>
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g., Ward 4, Civil Lines"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
              daylight
                ? "border-zinc-300 bg-zinc-50 text-zinc-950"
                : "border-zinc-700 bg-zinc-950 text-white"
            }`}
          />
        </div>

        {/* Printable Poster Card */}
        <div
          id="printable-poster"
          className="mt-5 rounded-2xl border-2 border-zinc-900 bg-white p-6 text-center text-zinc-950 shadow-sm"
        >
          <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
            Community Emergency Board
          </span>
          <h3 className="mt-2 text-xl font-black tracking-tight">{areaName}</h3>
          <p className="mt-1 text-xs font-medium text-zinc-600">
            Scan for Urgent Blood, Clean Water, Medical Aid & Road Alerts
          </p>

          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="BeaconMesh QR Code"
              className="mx-auto my-4 h-44 w-44 rounded-xl border border-zinc-200 p-2"
            />
          )}

          <p className="text-xs font-bold text-zinc-900 break-all">{shareUrl}</p>
          {userCoords && (
            <p className="mt-1 text-[11px] text-zinc-500">
              Sector GPS: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
            </p>
          )}
          <p className="mt-3 border-t border-zinc-200 pt-2.5 text-[11px] font-semibold text-zinc-600">
            No Login Required • Works Offline • Emergency Helpline: 112
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500"
          >
            <Printer className="h-4 w-4" />
            Print Poster
          </button>

          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`beaconmesh-${areaName.toLowerCase().replace(/\s+/g, "-")}.png`}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold ${
                daylight
                  ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                  : "border-zinc-700 bg-zinc-800 text-white"
              }`}
            >
              <Download className="h-4 w-4" />
              Save QR Image
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopySiteLink}
          className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold ${
            daylight
              ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          {copiedLink ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              WhatsApp Invite Copied!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Copy WhatsApp Group Invite Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
