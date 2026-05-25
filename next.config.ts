import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── HTTP security headers (OWASP A05 hardening, May 2026) ───────
  // Applied to every route via a catch-all source pattern.
  // X-Frame-Options: DENY — prevents click-jacking by refusing to
  //   render the app inside any <frame> / <iframe>.
  // X-Content-Type-Options: nosniff — stops browsers from MIME-sniffing
  //   a response away from the declared Content-Type.
  // Referrer-Policy: strict-origin-when-cross-origin — sends the full
  //   URL for same-origin requests; only the origin for cross-origin
  //   ones; nothing on downgrades (https → http).
  // Permissions-Policy — opt out of powerful browser features the
  //   platform doesn't use (camera, microphone, geolocation).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "DENY" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  serverExternalPackages: ["unzipper", "archiver", "@prisma/client", "bcryptjs", "unpdf", "mammoth"],
  // /admin/security reads markdown files at runtime from docs/security/.
  // Without an explicit trace include, Vercel's file-tracing layer can
  // exclude content outside `app/` from the serverless function bundle,
  // making fs.readFileSync 404 in production. Pin the directory.
  outputFileTracingIncludes: {
    "/admin/security": ["./docs/security/**/*"],
  },
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
