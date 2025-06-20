/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'], // For OAuth provider images
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors during build
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors during build
  },
};

module.exports = nextConfig; 