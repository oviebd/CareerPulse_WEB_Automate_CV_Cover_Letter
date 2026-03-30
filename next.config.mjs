/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedImageHosts = (process.env.NEXT_IMAGE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig = {
  /** Fixes standalone trace when another lockfile exists above this project (e.g. home dir). */
  outputFileTracingRoot: path.join(__dirname),
  /** When set (e.g. Build/build_30Mar_10.37PM), production build output goes there. Default: .next */
  distDir: process.env.BUILD_DIST_DIR?.trim() || '.next',
  /** Minimal server bundle for cPanel/VPS: extract zip, copy static+public (script does this), run `node server.js` */
  output: 'standalone',
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
