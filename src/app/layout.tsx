import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeaconMesh — Civic & Emergency Mutual Aid Ledger",
  description:
    "Offline-first, community-verified neighborhood ledger for emergency resources, blood donors, clean water, shelter, and road hazards.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
