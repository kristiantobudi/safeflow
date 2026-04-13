/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://localhost:3000'],
  transpilePackages: ['@repo/ui', '@repo/api', '@repo/validation'],
  output: 'standalone',
};

export default nextConfig;
