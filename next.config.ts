import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a standalone build — smaller Docker-compatible output
  output: "standalone",
};

export default nextConfig;
