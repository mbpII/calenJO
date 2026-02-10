import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  // Disable dev indicators for clean static export
  devIndicators: false,
  // Add trailing slashes for better static hosting compatibility
  trailingSlash: true
};

export default nextConfig;
