import { z } from 'zod';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format');

const envSchema = z.object({
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1, 'WALLET_CONNECT_PROJECT_ID is required'),
  NEXT_PUBLIC_RPC_URL_BASE_MAINNET: z.string().url().default('https://mainnet.base.org'),
  NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: z.string().url().default('https://sepolia.base.org'),
  NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET: addressSchema,
  NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA: addressSchema,
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

  // First pass: validate basic structure
  const parsed = envSchema.safeParse(publicEnv);
  if (!parsed.success) {
    const target = typeof window !== 'undefined' ? 'client' : 'server';
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `[${target}] Configuration Error: Missing or invalid required environment variables.\n${issues}\n\nCheck your .env.local file against .env.example.`,
    );
  }

  const { data } = parsed;

  // Second pass: validate that the directory address for the ACTIVE chain
  // is a real contract address (not the zero address).
  const isMainnetActive =
    data.NEXT_PUBLIC_ACTIVE_CHAIN === 'base' || data.NEXT_PUBLIC_ACTIVE_CHAIN === '8453';

  if (isMainnetActive) {
    if (
      data.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET === '0x0000000000000000000000000000000000000000'
    ) {
      throw new Error(
        'Configuration Error: NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET is set to the zero address ' +
          'but Base Mainnet is the active chain. Provide a real ProtocolDirectory contract address.',
      );
    }
  } else {
    if (
      data.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA === '0x0000000000000000000000000000000000000000'
    ) {
      throw new Error(
        'Configuration Error: NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA is set to the zero address ' +
          'but Base Sepolia is the active chain. Provide a real ProtocolDirectory contract address.',
      );
    }
  }

  return data;
};

export const env = getEnv();
export type EnvConfig = z.infer<typeof envSchema>;
