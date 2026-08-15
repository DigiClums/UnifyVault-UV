/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
