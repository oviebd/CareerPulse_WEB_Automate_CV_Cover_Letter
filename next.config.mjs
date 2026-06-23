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
  serverExternalPackages: ['puppeteer', '@napi-rs/canvas', 'pdfjs-dist'],
  /** pdfjs worker + native canvas must ship with standalone/Docker output for CV upload. */
  outputFileTracingIncludes: {
    '/api/extract': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.mjs',
      './node_modules/pdfjs-dist/cmaps/**',
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
    ],
  },
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
  /** Hide the bottom-left dev "N" indicator in development (logout lives in the profile avatar menu). */
  devIndicators: false,
};

export default nextConfig;
