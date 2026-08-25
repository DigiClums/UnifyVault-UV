/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isExport ? { output: 'export', distDir: 'out', images: { unoptimized: true } } : {}),
  serverExternalPackages: ['tesseract.js', 'pdf-parse'],
  transpilePackages: ['@rainbow-me/rainbowkit'],
  webpack: (config, { webpack }) => {
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

