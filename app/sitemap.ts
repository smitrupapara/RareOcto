import type { MetadataRoute } from "next";

import { listAllProductSlugs } from "@/lib/catalog/queries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rareocto.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/try-on`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listAllProductSlugs();
    productRoutes = slugs.map(({ slug, created_at }) => ({
      url: `${SITE_URL}/catalog/${slug}`,
      lastModified: new Date(created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // If the DB is unreachable at build time, ship the static routes anyway.
    productRoutes = [];
  }

  return [...staticRoutes, ...productRoutes];
}
