/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'viem',
      'wagmi',
      '@rainbow-me/rainbowkit',
      'framer-motion',
    ],
  },
  ...(isExport ? { output: 'export', distDir: 'out', images: { unoptimized: true } } : {}),
  serverExternalPackages: ['tesseract.js', 'pdf-parse'],
  transpilePackages: ['@rainbow-me/rainbowkit'],
  webpack: (config, { webpack, isServer }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402\//,
      }),
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      lokijs: false,
      encoding: false,
    };
    return config;
  },
  async redirects() {
    if (isExport) return [];
    return [
      {
        source: '/transaction',
        destination: '/transactions',
        permanent: true,
      },
      {
        source: '/transaction/:path*',
        destination: '/transactions/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
