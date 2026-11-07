import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";
import SwRegister from "./sw-register";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearanceBoot";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;600;700;800" +
  "&family=Instrument+Serif:ital@0;1" +
  "&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700" +
  "&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

export const metadata: Metadata = {
  title: "Project Locker",
  description: "Project Locker — a personal locker for every app you have designed, built and shipped.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Project Locker",
    startupImage: "/icon.jpg",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0891b2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-vtheme="daylight" suppressHydrationWarning>
        <head>
          <Script id="appearance-boot" strategy="beforeInteractive">{APPEARANCE_BOOT_SCRIPT}</Script>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={FONTS_URL} />
        </head>
        <body className="antialiased">
          {children}
          <SwRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
