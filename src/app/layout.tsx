import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { PwaRegistration } from "@/components/storefront/pwa-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const displayFace = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SupplyHub",
    template: "%s · SupplyHub",
  },
  description:
    "A premium multi-vendor marketplace connecting independent makers with discerning customers.",
  applicationName: "SupplyHub",
  openGraph: {
    type: "website",
    siteName: "SupplyHub",
    title: "SupplyHub — objects with a maker's name on them",
    description:
      "A curated marketplace for independent studios. Know who made the piece and where it came from.",
    images: [
      {
        url: "/images/demo/hero.jpg",
        width: 1024,
        height: 1536,
        alt: "A still life of handmade ceramics, linen, and leather.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SupplyHub — objects with a maker's name on them",
    description:
      "A curated marketplace for independent studios. Know who made the piece and where it came from.",
    images: ["/images/demo/hero.jpg"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#070a14" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFace.variable}`}
    >
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
