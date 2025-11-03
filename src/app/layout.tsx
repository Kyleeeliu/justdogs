import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Just Dogs Training App",
  description: "Comprehensive dog training management for trainers, parents, and administrators",
  keywords: "dog training, pet care, Cape Town, South Africa, Just Dogs",
  authors: [{ name: "Just Dogs" }],
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
      </head>
      <body className="min-h-screen bg-gray-50 text-base leading-relaxed">
        <div className="flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
