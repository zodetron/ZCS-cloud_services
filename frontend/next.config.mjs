import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load root .env for local dev (frontend/../.env).
// In Docker, NEXT_PUBLIC_API_URL is injected as a build ARG — dotenv silently
// ignores a missing file and never overwrites vars already in process.env.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
