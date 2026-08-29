import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project so Next.js doesn't infer it
    // from a lockfile in a parent directory.
    root: path.join(__dirname),
  },
};

export default nextConfig;
