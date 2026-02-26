// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — private bucket signed URLs
      // Pattern: https://<project>.supabase.co/storage/v1/object/sign/...
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Supabase Storage — public bucket URLs
      // Pattern: https://<project>.supabase.co/storage/v1/object/public/...
      {
        protocol: 'https',
        hostname: '**.supabase.com',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
}

export default nextConfig