import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeaconMesh — Emergency Mutual Aid Ledger",
  description:
    "High-contrast, offline-first neighborhood ledger for urgent medical, water, shelter, and road hazard alerts.",
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
