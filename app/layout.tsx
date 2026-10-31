import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Butaca · What to watch tonight",
  description: "Tell Butaca what you like and which streaming services you pay for, and it picks what to watch tonight in Mexico.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#130B16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,800;1,6..96,500;1,6..96,800&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <link rel="preconnect" href="https://image.tmdb.org" />
      </head>
      <body>{children}</body>
    </html>
  );
}
