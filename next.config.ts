import type { NextConfig } from "next";
import { loadEnvConfig } from '@next/env';

// Load environment variables
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
