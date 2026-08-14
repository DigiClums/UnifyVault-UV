import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

const DEPLOYER_PK = (process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY) as
  `0x${string}` | undefined;

if (!DEPLOYER_PK) {
  console.error('ERROR: PRIVATE_KEY or DEPLOYER_PRIVATE_KEY is required in environment.');
  process.exit(1);
}

const deployerAccount = privateKeyToAccount(DEPLOYER_PK);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: deployerAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const CANONICAL_P2P_ESCROW_V2 = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const CANONICAL_UVBE_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const GOVERNANCE_ROLE =
  '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as const;
const GUARDIAN_ROLE = '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041' as const;
const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

const MARKETPLACE_ABI = parseAbi([
  'function p2pEscrow() external view returns (address)',
  'function uvbeToken() external view returns (address)',
  'function defaultPaymentWindow() external view returns (uint256)',
  'function getOrderCount() external view returns (uint256)',
  'function paused() external view returns (bool)',
  'function setUvbeToken(address newUvbeToken) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function takeOrder(uint256 orderId, uint256 takeAmount) external returns (uint256 matchId, uint256 escrowTradeId)',
]);

async function main() {
  console.log('=== DEPLOYING AUDITED MARKETPLACE TO BASE SEPOLIA ===');
  console.log('Deployer:', deployerAccount.address);
  console.log('Target P2PEscrowV2:', CANONICAL_P2P_ESCROW_V2);
  console.log('Target Canonical UVBE:', CANONICAL_UVBE_TOKEN);

  const balance = await publicClient.getBalance({ address: deployerAccount.address });
  console.log('Deployer Balance:', balance.toString(), 'wei');
  if (balance === 0n) {
    throw new Error('Deployer has 0 ETH on Base Sepolia. Please fund the account.');
  }

  // 1. Load Compiled Artifact
  const artifactPath = path.resolve(
    __dirname,
    '../packages/protocol/out/Marketplace.sol/Marketplace.json',
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run "forge build" first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode.object as `0x${string}`;
  const abi = artifact.abi;

  // 2. Deploy Marketplace
  console.log('\n--- 1. Deploying Marketplace Contract ---');
  const deployTxHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [CANONICAL_P2P_ESCROW_V2],
    gas: 3_500_000n,
  });
  console.log('Deploy TX Hash:', deployTxHash);
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  const newMarketplaceAddress = deployReceipt.contractAddress!;
  console.log('>>> MARKETPLACE DEPLOYED AT:', newMarketplaceAddress);

  // 3. Set Canonical UVBE Token
  console.log('\n--- 2. Setting Canonical UVBE Token ---');
  const setTokenTxHash = await walletClient.writeContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'setUvbeToken',
    args: [CANONICAL_UVBE_TOKEN],
  });
  console.log('setUvbeToken TX Hash:', setTokenTxHash);
  await publicClient.waitForTransactionReceipt({ hash: setTokenTxHash });

  // 4. Post-Deployment Verification
  console.log('\n--- 3. On-Chain Parameter Verification ---');
  const onChainEscrow = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'p2pEscrow',
  });
  const onChainUvbe = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'uvbeToken',
  });
  const paymentWindow = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'defaultPaymentWindow',
  });
  const orderCount = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'getOrderCount',
  });
  const isPaused = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'paused',
  });
  const hasAdmin = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'hasRole',
    args: [DEFAULT_ADMIN_ROLE, deployerAccount.address],
  });
  const hasGov = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'hasRole',
    args: [GOVERNANCE_ROLE, deployerAccount.address],
  });
  const hasGuardian = await publicClient.readContract({
    address: newMarketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'hasRole',
    args: [GUARDIAN_ROLE, deployerAccount.address],
  });

  console.log('Verified p2pEscrow():', onChainEscrow);
  console.log('Verified uvbeToken():', onChainUvbe);
  console.log('Verified defaultPaymentWindow():', paymentWindow.toString());
  console.log('Verified getOrderCount():', orderCount.toString());
  console.log('Verified paused():', isPaused);
  console.log('Verified DEFAULT_ADMIN_ROLE:', hasAdmin);
  console.log('Verified GOVERNANCE_ROLE:', hasGov);
  console.log('Verified GUARDIAN_ROLE:', hasGuardian);

  if (
    onChainEscrow.toLowerCase() !== CANONICAL_P2P_ESCROW_V2.toLowerCase() ||
    onChainUvbe.toLowerCase() !== CANONICAL_UVBE_TOKEN.toLowerCase() ||
    paymentWindow !== 900n ||
    orderCount !== 0n ||
    isPaused !== false ||
    !hasAdmin ||
    !hasGov ||
    !hasGuardian
  ) {
    throw new Error('On-chain verification assertions failed!');
  }

  console.log('\n======================================================');
  console.log('MARKETPLACE DEPLOYMENT AND WIRING 100% SUCCESSFUL!');
  console.log('New Marketplace Address:', newMarketplaceAddress);
  console.log('======================================================');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
