import type { Metadata } from "next";
import { BUSINESS } from "@/config/site";

interface PageSeo {
  /** Page title without the site name. Omit on the home page. */
  title?: string;
  description: string;
  /** Path of the page, e.g. "/proceduri". */
  path: string;
}

const HOME_TITLE = `${BUSINESS.name} - Салон за красота в София и Лом`;

/**
 * Metadata for a public page: title, description, canonical URL and matching
 * social-share tags, so a shared link shows that page and not the home page.
 */
export function pageMetadata({ title, description, path }: PageSeo): Metadata {
  const socialTitle = title ? `${title} | ${BUSINESS.name}` : HOME_TITLE;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: BUSINESS.name,
      url: path,
      title: socialTitle,
      description,
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${BUSINESS.name} - салон за красота` }],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: ["/og-image.jpg"] },
  };
}

export { HOME_TITLE };
