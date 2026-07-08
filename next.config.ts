import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for better-sqlite3 (native Node.js module) and @react-pdf/renderer
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer"],
};

export default nextConfig;
