import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1).default('YOUR_PROJECT_ID'),
  NEXT_PUBLIC_RPC_URL_BASE_MAINNET: z.string().url().default('https://mainnet.base.org'),
  NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: z.string().url().default('https://sepolia.base.org'),
  NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET: z
    .string()
    .regex(/^0x[a-fA-F0-9]{38,40}$/, 'Invalid Base Mainnet Directory Address')
    .default('0x0000000000000000000000000000000000000000'),
  NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA: z
    .string()
    .regex(/^0x[a-fA-F0-9]{38,40}$/, 'Invalid Base Sepolia Directory Address')
    .default('0xf283FD65Ed82398c76aFC073eDad7FceEC2495Cb'),
  NEXT_PUBLIC_ACTIVE_CHAIN: z
    .enum(['base', 'base-sepolia', '8453', '84532'])
    .default('base-sepolia'),
});

const getEnv = () => {
  // Capture process.env references statically for Next.js bundler inlining
  const publicEnv = {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    NEXT_PUBLIC_RPC_URL_BASE_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET,
    NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA,
    NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET: process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET,
    NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA,
    NEXT_PUBLIC_ACTIVE_CHAIN: process.env.NEXT_PUBLIC_ACTIVE_CHAIN,
  };

  const parsed = envSchema.safeParse(publicEnv);
  if (!parsed.success) {
    if (typeof window !== 'undefined') {
      console.error('❌ Invalid client environment variables:', parsed.error.format());
    } else {
      console.error('❌ Invalid server environment variables:', parsed.error.format());
    }
    throw new Error('Invalid environment variables config');
  }
  return parsed.data;
};

export const env = getEnv();
export type EnvConfig = z.infer<typeof envSchema>;
