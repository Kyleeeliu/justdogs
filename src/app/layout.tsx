import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";
import { AuthErrorHandler } from "@/components/AuthErrorHandler";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Just Dogs Training App",
  description: "Comprehensive dog training management for trainers, parents, and administrators",
  keywords: "dog training, pet care, Cape Town, South Africa, Just Dogs",
  authors: [{ name: "Just Dogs" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Just Dogs",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/images/icons/logo.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/images/icons/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: 'rgb(0 32 96)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Preload Comic Sans fonts with web-optimized formats for immediate loading on all devices */}
        <link
          rel="preload"
          href="/fonts/comicfont/Comic Sans MS/Web Fonts/7cc6719bd5f0310be3150ba33418e72e.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/comicfont/Comic Sans MS/Web Fonts/7cc6719bd5f0310be3150ba33418e72e.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        {/* Preload Reindeer Games font for slogan */}
        <link
          rel="preload"
          href="/fonts/KBREINDEERGAMES.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for faster font loading */}
        <link rel="dns-prefetch" href="/fonts/" />
      </head>
      <body className="min-h-screen bg-gray-50 text-base leading-relaxed">
        <ServiceWorkerRegister />
        <AuthErrorHandler />
        <AuthErrorBoundary>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              {children}
            </div>
          </AuthProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
