/** @type {import('next').NextConfig} */
const allowedImageHosts = (process.env.NEXT_IMAGE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
  },
  serverExternalPackages: ['puppeteer', 'pdf-parse', 'pdfjs-dist'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  images: {
    remotePatterns: allowedImageHosts.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
