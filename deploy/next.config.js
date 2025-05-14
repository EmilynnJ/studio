/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      }
    ],
  },
  env: {
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    NEXT_PUBLIC_WEBRTC_ICE_SERVERS: process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS,
    NEXT_PUBLIC_SIGNALING_SERVER_URL: process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL,
  }
};

module.exports = nextConfig;
