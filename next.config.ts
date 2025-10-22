import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ This line tells Vercel to ignore lint errors during deployment
  },
};

export default nextConfig;
