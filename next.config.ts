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
  // Inlined at build time so the sidebar can show a short SHA to staff.
  // Vercel sets VERCEL_GIT_COMMIT_SHA automatically; empty string locally.
  env: {
    NEXT_PUBLIC_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
};

export default nextConfig;
