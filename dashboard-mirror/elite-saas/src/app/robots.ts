import type { MetadataRoute } from "next";

// Admin dashboard — must never be indexed. Disallow all crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
