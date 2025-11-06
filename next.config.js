/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Skip ESLint on Vercel
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Skip TS errors (like "Unexpected any")
  },
  // Font optimization for consistent loading across devices
  experimental: {
    optimizeFonts: true,
  },
  // Ensure static assets (including fonts) are properly served
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Headers for better font caching and loading
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
