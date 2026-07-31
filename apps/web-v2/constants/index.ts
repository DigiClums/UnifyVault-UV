import { baseSepolia, base } from 'viem/chains';

export const ACTIVE_CHAIN_NAME = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base-sepolia';

export const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ||
  '0xd905920c91853039060246Ed5724AA72B91a96DA') as `0x${string}`;

export const APP_DOMAIN = 'https://app.unifyvault.xyz';

export const CHAIN_CONFIG = ACTIVE_CHAIN_NAME === 'base' ? base : baseSepolia;

export const RPC_URL =
  ACTIVE_CHAIN_NAME === 'base'
    ? process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET || 'https://mainnet.base.org'
    : process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org';

export const PROTOCOL_DIRECTORY_ADDRESS = (
  ACTIVE_CHAIN_NAME === 'base'
    ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET ||
      '0x0000000000000000000000000000000000000000'
    : process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA ||
      '0xB5dd6d766867cB4c299AD2711068455C718EDDbc'
) as `0x${string}`;

// Deployed Base Sepolia V2 Suite Addresses (Verified Live)
export const FALLBACK_ADDRESSES = {
  DIRECTORY: PROTOCOL_DIRECTORY_ADDRESS,
  CONTROLLER: '0x7EF5D93f83995228efFc63dbe513367a719f0633' as `0x${string}`,
  VAULT: '0x54696d5d00b58F27F9d8C358560ff2a7d10d409e' as `0x${string}`,
  TREASURY: '0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D' as `0x${string}`,
  ORACLE: '0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635' as `0x${string}`,
  TOKEN: '0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4' as `0x${string}`,
  STRATEGY_MANAGER: '0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0' as `0x${string}`,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  WBTC: '0xc83D0A904E1103d8144E9DF93cdb5bC05f7cdee6' as `0x${string}`,
  WETH: '0xEEAa69Db6046f026d88004d0D6946518071bA15c' as `0x${string}`,
};

export const MODULE_IDS = {
  ORACLE: '0x3b1ee6ca4eeb9c6ad6673eb8932bf5a92a549d443c7b643a6d9b925b6a715f5d' as `0x${string}`,
  VAULT: '0x15ee1728eb7c4f4efb70fa67f13b632007e2a4a3bc6c3b6bf11b0e3532f7a08b' as `0x${string}`,
  TREASURY: '0x42a0b181b5b47a95015a97576f3f019f187a5525c2763261a8ef1f22146440db' as `0x${string}`,
  TOKEN: '0xbf7ebaa000c0a9fa93e2b9c7b9bc976865239a5f782c5f0f35be9a6bb7c30d3d' as `0x${string}`,
  STRATEGY_MANAGER:
    '0xc0953efdd70ee7b3096b7bb7b98bf5a04a6015b630e2f5b610c14b7e1ec9560f' as `0x${string}`,
  PORTFOLIO_MANAGER:
    '0x6e9f291e1d3550fa070dd47d79b90cbf6e60b296b1b53e8e19e0b190fbd455f5' as `0x${string}`,
  SWAP_ADAPTER:
    '0xb231c51000cf51a99a8ea4b2049d5bf92361b7f94bb4979e2a4666cf76595a8f' as `0x${string}`,
  FEE_MANAGER:
    '0xb386ebf492bf5541e21b8c638202d0cfceb3a0e67611e9f1a0e1c07153a5df65' as `0x${string}`,
  COST_BASIS_MANAGER:
    '0xb4e1b8b7e2dfa9a3b8d4c38d8d75e47854bc67c00e6c46698650f00f074d2847' as `0x${string}`,
};
