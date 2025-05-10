
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
    // STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SIGNING_SECRET should NOT be added here
    // as they are server-side only and exposing them client-side is a security risk.
    // They will be accessed directly via process.env on the server (e.g., in API routes).
  }
};

export default nextConfig;

