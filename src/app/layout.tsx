import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteSchema } from "@/components/seo/structured-data";
import { BUSINESS, SITE_URL as siteUrl } from "@/config/site";
import { HOME_TITLE, pageMetadata } from "@/lib/seo";

// Fonts are downloaded at build time and served from this site (no requests to Google).
const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

const DESCRIPTION =
  "Салон за красота Classy & Beautiful в София и Лом: педикюр, лазерна епилация, мигли, вежди и терапии за лице. Вижте цените и запазете час онлайн.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...pageMetadata({ description: DESCRIPTION, path: "/" }),
  title: { default: HOME_TITLE, template: `%s | ${BUSINESS.name}` },
  applicationName: BUSINESS.name,
  icons: { icon: "/logo.svg" },
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  formatDetection: { telephone: true, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Google Search Console: set GOOGLE_SITE_VERIFICATION to the code from the "HTML tag" method.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className={`${display.variable} ${body.variable}`}>
      <head>
        <SiteSchema />
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
