import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// 1. INITIALIZE THE AUTOMATED SERVICE WORKER GENERATOR
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || Boolean(process.env.VERCEL), // Runs compiler checks only on production builds
  register: true,
  workboxOptions: { skipWaiting: true },
});

// 2. YOUR BASE NEXT.JS CONFIGURATION MATRIX
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: ".next-production",
  experimental: {
    inlineCss: true, // Optimizes first-load performance for Tailwind CSS
  },
  async headers() {
    return [
      {
        source: '/:path*{/}?',
        headers: [
          {
            key: 'X-Accel-Buffering',
            value: 'no', // Disables proxy buffering for Server-Sent Events / Suspense streaming
          },
        ],
      },
    ];
  },
};

// 3. EXPORT THE WRAPPED MULTI-THREAD COMPILER CONTEXT
export default withPWA(nextConfig);
