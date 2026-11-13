import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/proceduri`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/rezervacii`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/poveritelnost`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
