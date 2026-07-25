import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // `bun:sqlite` is a Bun built-in — never bundle it.
  serverExternalPackages: ["bun:sqlite"],
};

export default nextConfig;
