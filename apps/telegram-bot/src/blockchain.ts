import { createPublicClient, http, formatEther, isAddress, parseAbi } from 'viem';
import { base } from 'viem/chains';

// Public Base Mainnet RPC
const RPC_URL =
  process.env.BASE_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

// Canonical Base Mainnet Deployed Addresses
export const CONTRACTS = {
  UVBEToken: '0x051979deb1eb4823672e6274a55c44d7818ff523' as `0x${string}`,
  UVBEStakingVault: '0x625a7697e9fdde7c6a783593ca371ed6c73e61e0' as `0x${string}`,
  UVBEReferralRegistry: '0x5d486ba39418bb63d03a27dbc77ccc88bb2bf4cc' as `0x${string}`,
  UVBERewardDistributor: '0xb8c565e7da406261baa4af922771bcca5bfc166a' as `0x${string}`,
  UnifyVaultController: '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c' as `0x${string}`,
  P2PEscrow: '0x400916339033b88cda38b1d8a5fb0f82e4889f38' as `0x${string}`,
  ProtocolDirectory: '0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5' as `0x${string}`,
};

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
]);

const STAKING_VAULT_ABI = parseAbi([
  'function getPermanentStake(address user) external view returns (uint256)',
  'function totalPermanentStaked() external view returns (uint256)',
  'function getStakeCount(address user) external view returns (uint256)',
]);

const REWARD_DISTRIBUTOR_ABI = parseAbi([
  'function getClaimableRewards(address user) external view returns (uint256)',
  'function getPendingRecurringReward(address user) external view returns (uint256)',
  'function getDetailedRewardInfo(address user) external view returns (uint256 recurringReward, uint256 directReward, uint256 generationReward, uint256 rankReward, uint256 daoReward, uint256 totalClaimable, uint256 totalClaimed, uint256 totalRestaked)',
  'function getCurrentAnnualBps() external view returns (uint256)',
]);

const REFERRAL_REGISTRY_ABI = parseAbi([
  'function getRank(address user) external view returns (uint8)',
  'function getReferrer(address user) external view returns (address)',
  'function getActiveDirectCount(address user) external view returns (uint256 activeCount)',
  'function getTeamVolume(address user) external view returns (uint256)',
]);

export interface OnChainUserData {
  address: `0x${string}`;
  ethBalance: string;
  uvbeBalance: string;
  stakedAmount: string;
  stakeCount: number;
  totalClaimableRewards: string;
  pendingRecurringReward: string;
  totalClaimed: string;
  rank: number;
  activeDirects: number;
  teamVolume: string;
  currentApyBps: number;
}

export async function fetchLiveUserData(userAddress: string): Promise<OnChainUserData> {
  if (!isAddress(userAddress)) {
    throw new Error('Invalid Ethereum / Base address');
  }

  const addr = userAddress as `0x${string}`;

  // Read ETH Balance
  const ethBalanceWei = await publicClient.getBalance({ address: addr });

  // Read UVBE Balance
  let uvbeBalanceWei = 0n;
  try {
    uvbeBalanceWei = await publicClient.readContract({
      address: CONTRACTS.UVBEToken,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    });
  } catch (e) {
    console.error('Error reading UVBE balance:', e);
  }

  // Read Staking info
  let permanentStakeWei = 0n;
  let stakeCountBig = 0n;
  try {
    permanentStakeWei = await publicClient.readContract({
      address: CONTRACTS.UVBEStakingVault,
      abi: STAKING_VAULT_ABI,
      functionName: 'getPermanentStake',
      args: [addr],
    });

    stakeCountBig = await publicClient.readContract({
      address: CONTRACTS.UVBEStakingVault,
      abi: STAKING_VAULT_ABI,
      functionName: 'getStakeCount',
      args: [addr],
    });
  } catch (e) {
    console.error('Error reading staking vault:', e);
  }

  // Read Rewards info
  let claimableWei = 0n;
  let recurringWei = 0n;
  let claimedWei = 0n;
  let apyBps = 0n;
  try {
    const details = await publicClient.readContract({
      address: CONTRACTS.UVBERewardDistributor,
      abi: REWARD_DISTRIBUTOR_ABI,
      functionName: 'getDetailedRewardInfo',
      args: [addr],
    });
    recurringWei = details[0];
    claimableWei = details[5];
    claimedWei = details[6];

    apyBps = await publicClient.readContract({
      address: CONTRACTS.UVBERewardDistributor,
      abi: REWARD_DISTRIBUTOR_ABI,
      functionName: 'getCurrentAnnualBps',
    });
  } catch (e) {
    console.error('Error reading rewards distributor:', e);
  }

  // Read Referral and Rank info
  let rank = 0;
  let activeDirects = 0;
  let teamVolumeWei = 0n;
  try {
    rank = Number(
      await publicClient.readContract({
        address: CONTRACTS.UVBEReferralRegistry,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getRank',
        args: [addr],
      }),
    );

    const directCount = await publicClient.readContract({
      address: CONTRACTS.UVBEReferralRegistry,
      abi: REFERRAL_REGISTRY_ABI,
      functionName: 'getActiveDirectCount',
      args: [addr],
    });
    activeDirects = Number(directCount);

    teamVolumeWei = await publicClient.readContract({
      address: CONTRACTS.UVBEReferralRegistry,
      abi: REFERRAL_REGISTRY_ABI,
      functionName: 'getTeamVolume',
      args: [addr],
    });
  } catch (e) {
    console.error('Error reading referral registry:', e);
  }

  return {
    address: addr,
    ethBalance: parseFloat(formatEther(ethBalanceWei)).toFixed(5),
    uvbeBalance: parseFloat(formatEther(uvbeBalanceWei)).toFixed(2),
    stakedAmount: parseFloat(formatEther(permanentStakeWei)).toFixed(2),
    stakeCount: Number(stakeCountBig),
    totalClaimableRewards: parseFloat(formatEther(claimableWei)).toFixed(2),
    pendingRecurringReward: parseFloat(formatEther(recurringWei)).toFixed(2),
    totalClaimed: parseFloat(formatEther(claimedWei)).toFixed(2),
    rank,
    activeDirects,
    teamVolume: parseFloat(formatEther(teamVolumeWei)).toFixed(2),
    currentApyBps: Number(apyBps),
  };
}

export async function fetchTxStatus(txHash: string) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    return {
      status: receipt.status === 'success' ? 'Confirmed ✅' : 'Reverted ❌',
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      from: receipt.from,
      to: receipt.to,
    };
  } catch (e) {
    return null;
  }
}

export interface ProtocolMetrics {
  totalPermanentStaked: string;
  vaultAvailableCapital: string;
  totalOutstandingLiabilities: string;
  currentAnnualApyPercent: string;
  currentEpochId: string;
  epochPoolAmount: string;
}

export async function fetchProtocolMetrics(): Promise<ProtocolMetrics> {
  let totalPermanentStaked = '0';
  let vaultAvailableCapital = '0';
  let totalOutstandingLiabilities = '0';
  let currentAnnualApyPercent = '0';
  let currentEpochId = '0';
  let epochPoolAmount = '0';

  try {
    const totalStakedWei = await publicClient.readContract({
      address: CONTRACTS.UVBEStakingVault,
      abi: STAKING_VAULT_ABI,
      functionName: 'totalPermanentStaked',
    });
    totalPermanentStaked = parseFloat(formatEther(totalStakedWei)).toLocaleString();
  } catch (e) {
    console.error('Error reading totalPermanentStaked:', e);
  }

  try {
    const availableWei = await publicClient.readContract({
      address: CONTRACTS.UVBEStakingVault,
      abi: parseAbi(['function getAvailableProtocolCapital() external view returns (uint256)']),
      functionName: 'getAvailableProtocolCapital',
    });
    vaultAvailableCapital = parseFloat(formatEther(availableWei)).toLocaleString();
  } catch (e) {
    console.error('Error reading availableCapital:', e);
  }

  try {
    const liabilitiesWei = await publicClient.readContract({
      address: CONTRACTS.UVBERewardDistributor,
      abi: parseAbi(['function totalOutstandingLiabilities() external view returns (uint256)']),
      functionName: 'totalOutstandingLiabilities',
    });
    totalOutstandingLiabilities = parseFloat(formatEther(liabilitiesWei)).toLocaleString();

    try {
      const apyBps = await publicClient.readContract({
        address: CONTRACTS.UVBERewardDistributor,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'getCurrentAnnualBps',
      });
      currentAnnualApyPercent = (Number(apyBps) / 100).toFixed(2);
    } catch (e) {
      console.error('Error reading apyBps:', e);
    }

    try {
      const epochId = await publicClient.readContract({
        address: CONTRACTS.UVBERewardDistributor,
        abi: parseAbi(['function currentDaoEpochId() external view returns (uint256)']),
        functionName: 'currentDaoEpochId',
      });
      currentEpochId = epochId.toString();

      const epochInfo = await publicClient.readContract({
        address: CONTRACTS.UVBERewardDistributor,
        abi: parseAbi([
          'function getDaoEpoch(uint256) external view returns ((uint256 epochId, uint256 poolAmount, uint256 totalShares, uint256 startTime, uint256 endTime, bool isFinalized))',
        ]),
        functionName: 'getDaoEpoch',
        args: [epochId],
      });
      epochPoolAmount = parseFloat(formatEther(epochInfo.poolAmount)).toLocaleString();
    } catch (e) {
      console.error('Error reading DAO epoch info:', e);
    }
  } catch (e) {
    console.error('Error reading distributor protocol metrics:', e);
  }

  return {
    totalPermanentStaked,
    vaultAvailableCapital,
    totalOutstandingLiabilities,
    currentAnnualApyPercent,
    currentEpochId,
    epochPoolAmount,
  };
}
