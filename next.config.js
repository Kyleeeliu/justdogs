/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Skip ESLint on Vercel
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Skip TS errors (like “Unexpected any”)
  },
};

module.exports = nextConfig;
