import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js attend un objet pour serverActions (bodySizeLimit, allowedOrigins possibles)
    serverActions: {},
  },
};

export default nextConfig;
