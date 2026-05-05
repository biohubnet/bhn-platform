import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unzipper", "archiver", "@prisma/client", "bcryptjs"],
};

export default nextConfig;
