import type { MetadataRoute } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const SITE_URL = "https://ipchun.live";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const res = await fetch(`${API_BASE}/performances`);
    if (res.ok) {
      const performances: { id: string; updatedAt: string }[] = await res.json();
      for (const p of performances) {
        entries.push({
          url: `${SITE_URL}/schedule/${p.id}`,
          lastModified: new Date(p.updatedAt),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // API unavailable — return homepage-only sitemap
  }

  return entries;
}
