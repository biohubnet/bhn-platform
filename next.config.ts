import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "archiver", "@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      // Cloudflare R2 public dev URL and any custom-domain bucket.
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
