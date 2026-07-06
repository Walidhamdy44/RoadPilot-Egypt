import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Performance optimizations for RoadPilot Egypt PWA.
   *
   * - Experimental optimizePackageImports: tree-shakes barrel exports from
   *   large libraries so only used components are bundled.
   * - Output standalone: produces a minimal server build for deployment.
   */
  experimental: {
    optimizePackageImports: [
      "recharts",
      "framer-motion",
      "lucide-react",
      "@tanstack/react-query",
      "zod",
    ],
  },

  // Enable source maps in production for error tracking but keep bundles lean
  productionBrowserSourceMaps: false,

  // Image optimization — use default loader for Vercel
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
