import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: "/nexus-operacional",
  trailingSlash: true,
  devIndicators: false,
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "echarts-for-react"]
  },
  webpack(config) {
    config.cache = false;
    return config;
  }
};

export default nextConfig;
