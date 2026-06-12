import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  experimental: {
    // Question-image uploads run through server actions; default cap is 1MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
  async headers() {
    // Long-lived immutable cache for hashed /public assets. The Plakat poster,
    // building-instruction PDFs, lego artwork, fonts etc. never change at the
    // same path, so repeat visits should come straight from the Vercel Edge
    // cache without re-fetching.
    return [
      {
        source:
          "/:path*.(webp|png|jpg|jpeg|gif|svg|SVG|ico|pdf|woff|woff2|ttf|otf)",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
    ];
  },
};

export default nextConfig;
