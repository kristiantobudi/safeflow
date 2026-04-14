/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://localhost:3000'],
  transpilePackages: [
    '@repo/ui',
    '@repo/api',
    '@repo/validation',
    'framer-motion',
  ],
  serverExternalPackages: ['jspdf', 'fflate'],
  output: 'standalone',
};

export default nextConfig;
