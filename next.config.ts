import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (Northflank); Vercel ignores it.
  output: "standalone",
  // The floating dev badge covers the account menu and the phone tab bar.
  devIndicators: false,
  // The submission landing page moved to /.
  async redirects() {
    return [{ source: "/hackathon", destination: "/", permanent: true }]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Private preview: never indexed, cached or previewed by search engines, on every route.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
