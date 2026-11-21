import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FitForge — Your stronger tomorrow",
  description: "Your personal home gym, workout planner and training journal.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitForge",
  },
};
export const viewport: Viewport = {
  themeColor: "#101218",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
