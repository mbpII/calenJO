import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  // Disable dev indicators for clean local/server output
  devIndicators: false
};

export default nextConfig;
