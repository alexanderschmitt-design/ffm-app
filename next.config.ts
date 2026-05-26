import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Question-image uploads run through server actions; default cap is 1MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
