import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    teardownTimeout: 1000,
    pool: 'forks',
    env: {
      NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: 'test-project-id',
      NEXT_PUBLIC_RPC_URL_BASE_MAINNET: 'https://mainnet.base.org',
      NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: 'https://sepolia.base.org',
      NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET: '0x1111111111111111111111111111111111111111',
      NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA: '0x2222222222222222222222222222222222222222',
      NEXT_PUBLIC_ACTIVE_CHAIN: 'base-sepolia',
    },
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
