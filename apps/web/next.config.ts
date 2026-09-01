import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for Docker — see apps/web/Dockerfile.
  // Vercel does its own serverless bundling and trips over a standalone
  // output (it looks for build artifacts in the default .next layout), so
  // only set this outside Vercel's build environment (process.env.VERCEL).
  output: process.env.VERCEL ? undefined : "standalone",
  // Monorepo: trace file dependencies from the workspace root, not just
  // this app, so pnpm's hoisted node_modules resolve correctly.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
