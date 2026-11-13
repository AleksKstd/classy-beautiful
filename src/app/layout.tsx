import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LocalBusinessSchema, WebsiteSchema } from "@/components/seo/structured-data";
import { SITE_URL as siteUrl } from "@/config/site";

// Fonts are downloaded at build time and served from this site (no requests to Google).
const display = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Classy & Beautiful - Елегантен салон за красота в София и Лом",
    template: "%s | Classy & Beautiful",
  },
  description:
    "CB Classy & Beautiful предлага професионални козметични процедури - маникюр, педикюр, лазерна епилация, мигли, вежди и терапии за лице. Салони в София и Лом. Резервирайте онлайн!",
  keywords: [
    "салон за красота",
    "козметичен салон",
    "София",
    "Лом",
    "маникюр",
    "педикюр",
    "лазерна епилация",
    "мигли",
    "вежди",
    "терапии за лице",
    "кола маска",
    "козметика",
    "Classy Beautiful",
  ],
  authors: [{ name: "Classy & Beautiful" }],
  creator: "Classy & Beautiful",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "bg_BG",
    url: siteUrl,
    siteName: "Classy & Beautiful",
    title: "Classy & Beautiful - Елегантен салон за красота",
    description: "Професионални козметични процедури в София и Лом. Маникюр, педикюр, лазерна епилация, мигли и още. Резервирайте онлайн!",
    // Add `images: [{ url: "/og-image.jpg", width: 1200, height: 630 }]` once public/og-image.jpg exists.
  },
  twitter: {
    card: "summary_large_image",
    title: "Classy & Beautiful - Елегантен салон за красота",
    description: "Професионални козметични процедури в София и Лом. Резервирайте онлайн!",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className={`${display.variable} ${body.variable}`}>
      <head>
        <LocalBusinessSchema />
        <WebsiteSchema />
      </head>
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        {/* Cookie-free, privacy-friendly visitor statistics (enable Web Analytics in Vercel) */}
        <Analytics />
      </body>
    </html>
  );
}
