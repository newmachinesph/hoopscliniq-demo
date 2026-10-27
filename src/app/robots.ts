import type { MetadataRoute } from "next"

// Private preview: no crawler may index any page. No sitemap on purpose.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } }
}
