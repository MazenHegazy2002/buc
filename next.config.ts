import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages read live data from Postgres on every request; we mark them with
  // `await connection()` instead of using the Cache Components model.
  cacheComponents: false,
  serverExternalPackages: ["@prisma/client", "googleapis"],
};

export default nextConfig;
