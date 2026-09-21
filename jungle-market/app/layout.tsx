import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "./install-prompt";
import JungleAssistant from "./jungle-assistant";

// 1. CONFIGURE THE PWA HARDWARE INTERFACE THEME
export const viewport: Viewport = {
  themeColor: "#072B1E",
  width: "device-width",
  initialScale: 1,
};

// 2. CONFIGURE PWA REGISTRATION HEADERS
export const metadata: Metadata = {
  title: "Jungle Market — Rooted in People",
  description: "A fair craft marketplace connecting artisans, field ambassadors, and thoughtful buyers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jungle Market",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    apple: "/icon-192x192.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}<InstallPrompt /><JungleAssistant /></body>
    </html>
  );
}
