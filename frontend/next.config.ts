import type { NextConfig } from 'next';

const backend_origin = process.env.BACKEND_ORIGIN ?? 'http://localhost:3001';

const next_config: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend_origin}/api/:path*` }];
  },
};

export default next_config;
