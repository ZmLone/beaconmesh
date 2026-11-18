import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeaconMesh — Emergency & Mutual Aid Network",
  description:
    "Real-time, offline-resilient neighborhood platform for blood donors, clean water, medical aid, rescue, and road alerts.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
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
        <Analytics />
      </body>
    </html>
  );
}
