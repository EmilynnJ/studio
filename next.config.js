/** @type {import('next').NextConfig} */
module.exports = {
  typescript: {
    // Don't ignore TypeScript errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't ignore ESLint errors
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // Improve module resolution
    config.resolve.fallback = { fs: false, path: false };
    return config;
  }
};