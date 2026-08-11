import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for Docker — see apps/web/Dockerfile.
  output: "standalone",
  // Monorepo: trace file dependencies from the workspace root, not just
  // this app, so pnpm's hoisted node_modules resolve correctly.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
