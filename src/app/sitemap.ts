import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://classybeautiful.bg";
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/reserve`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Fetch procedures for dynamic pages
  try {
    const supabase = createClient();
    const { data: procedures } = await supabase
      .from("procedures")
      .select("id")
      .eq("is_active", true);

    const procedurePages: MetadataRoute.Sitemap = (procedures || []).map((procedure) => ({
      url: `${baseUrl}/reserve?procedure=${procedure.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...procedurePages];
  } catch {
    return staticPages;
  }
}
