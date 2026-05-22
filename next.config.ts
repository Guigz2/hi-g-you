import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js attend un objet pour serverActions (bodySizeLimit, allowedOrigins possibles)
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.app.github.dev",  // ← autorise toutes les URL Codespaces
      ],
    },
  },
};

export default nextConfig;
