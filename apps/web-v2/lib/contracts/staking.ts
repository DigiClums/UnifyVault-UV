import { parseAbi } from 'viem';

/**
 * UVBEStakingVault ABI (Permanent locked protocol-owned staking capital)
 */
export const STAKING_VAULT_ABI = parseAbi([
  // Core Staking & Protocol Capital
  'function MIN_STAKE() external view returns (uint256)',
  'function MAX_STAKE() external view returns (uint256)',
  'function ADMIN_FEE_BPS() external view returns (uint256)',
  'function token() external view returns (address)',
  'function treasury() external view returns (address)',
  'function registry() external view returns (address)',
  'function distributor() external view returns (address)',
  'function paused() external view returns (bool)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function totalPermanentStaked() external view returns (uint256)',
  'function getPermanentStake(address user) external view returns (uint256)',
  'function getAvailableProtocolCapital() external view returns (uint256)',
  'function totalProtocolCapital() external view returns (uint256)',
  'function getStakeCount(address user) external view returns (uint256)',
  'function getStakeRecord(address user, uint256 index) external view returns (uint256 amount, uint256 stakedAt)',
  'function stake(uint256 amount, address referrer) external',
  'function stakeWithPermit(uint256 amount, address referrer, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function recordRestake(address user, uint256 amount) external',
  'function disburseReward(address recipient, uint256 amount) external',
  'function setModules(address newRegistry, address newDistributor) external',
  'function pause() external',
  'function unpause() external',

  // Events
  'event StakeCreated(address indexed user, uint256 indexed stakeId, uint256 grossAmount, uint256 protocolCapital, uint256 treasuryFee, address indexed referrer)',
  'event PermanentStakeIncreased(address indexed user, uint256 indexed stakeId, uint256 amount, bool isRestake)',
  'event TreasuryFeeCollected(address indexed user, address indexed treasury, uint256 feeAmount)',
  'event RewardDisbursed(address indexed recipient, uint256 amount, uint256 remainingCapital)',
  'event RegistryUpdated(address indexed oldRegistry, address indexed newRegistry)',
  'event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor)',
]);

/**
 * UVBEReferralRegistry ABI (10-Gen Referral Tree & Deterministic Rank Engine)
 */
export const REFERRAL_REGISTRY_ABI = parseAbi([
  // Views
  'function MIN_ACTIVE_STAKE() external view returns (uint256)',
  'function MAX_GENERATION_DEPTH() external view returns (uint8)',
  'function MAX_CYCLE_CHECK_DEPTH() external view returns (uint8)',
  'function genesisReferrer() external view returns (address)',
  'function vault() external view returns (address)',
  'function distributor() external view returns (address)',
  'function getReferrer(address user) external view returns (address)',
  'function getDirects(address user) external view returns (address[])',
  'function getActiveDirectCount(address user) external view returns (uint256 activeCount)',
  'function getTeamVolume(address user) external view returns (uint256)',
  'function getRank(address user) external view returns (uint8)',
  'function isUserActive(address user) external view returns (bool)',
  'function getDaoLeaders() external view returns (address[])',
  'function getDaoLeaderShares() external view returns (address[] leaders, uint256[] shares, uint256 totalShares)',
  'function getUplineChain(address user, uint8 maxDepth) external view returns (address[] upline)',

  // Writes & Management
  'function recordStake(address user, uint256 amount, address referrer, bool isRestake) external',
  'function setModules(address vaultAddress, address distributorAddress) external',

  // Events
  'event ReferralRegistered(address indexed user, address indexed referrer, uint256 timestamp)',
  'event TeamVolumeUpdated(address indexed upline, uint256 addedVolume, uint256 totalVolume)',
  'event RankAchieved(address indexed user, uint8 rankId, uint256 milestoneReward)',
]);

/**
 * UVBERewardDistributor ABI (Dynamic APY, Affiliate Commissions & DAO Leadership Pool)
 */
export const REWARD_DISTRIBUTOR_ABI = parseAbi([
  // Constants & Parameters
  'function BPS_DENOMINATOR() external view returns (uint256)',
  'function MAX_RECURRING_ANNUAL_BPS() external pure returns (uint256)',
  'function getCurrentAnnualBps() external view returns (uint256)',
  'function currentAnnualBps() external view returns (uint256)',
  'function getRewardCapacity() external view returns (uint256 availableCapital, uint256 liabilities, uint256 surplusCapacity, uint256 currentBps)',
  'function SECONDS_PER_YEAR() external view returns (uint256)',
  'function DAO_POOL_BPS() external view returns (uint256)',
  'function DAO_CYCLE_DURATION() external view returns (uint256)',
  'function token() external view returns (address)',
  'function vault() external view returns (address)',
  'function registry() external view returns (address)',
  'function paused() external view returns (bool)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function totalOutstandingLiabilities() external view returns (uint256)',
  'function totalRewardPaid() external view returns (uint256)',
  'function currentDaoEpochId() external view returns (uint256)',
  'function getDaoEpoch(uint256 epochId) external view returns ((uint256 epochId, uint256 poolAmount, uint256 totalShares, uint256 startTime, uint256 endTime, bool isFinalized))',
  'function rewardIndex() external view returns (uint256)',
  'function lastUpdateTimestamp() external view returns (uint256)',

  // Reward Queries
  'function getClaimableRewards(address user) external view returns (uint256)',
  'function getPendingRecurringReward(address user) external view returns (uint256)',
  'function getDetailedRewardInfo(address user) external view returns (uint256 recurringReward, uint256 directReward, uint256 generationReward, uint256 rankReward, uint256 daoReward, uint256 totalClaimable, uint256 totalClaimed, uint256 totalRestaked)',

  // Reward Execution
  'function distributeCommissions(address staker, uint256 amount, bool isRestake) external',
  'function accrueRecurringReward(address user) external',
  'function checkpoint() external',
  'function claimRewards(uint256 amount) external',
  'function claimAllRewards() external',
  'function restakeRewards(uint256 amount) external',
  'function restakeAllRewards() external',
  'function finalizeDaoEpoch(uint256 epochId) external',
  'function claimDaoEpochReward(uint256 epochId) external',
  'function setModules(address vaultAddress, address registryAddress) external',
  'function pause() external',
  'function unpause() external',

  // Events
  'event RecurringRewardAccrued(address indexed user, uint256 amount, uint256 totalClaimableRecurring)',
  'event DirectRewardAccrued(address indexed beneficiary, address indexed fromUser, uint256 amount)',
  'event GenerationRewardAccrued(address indexed beneficiary, address indexed fromUser, uint8 generation, uint256 amount)',
  'event RankRewardAccrued(address indexed user, uint8 rankId, uint256 amount)',
  'event DaoPoolFunded(uint256 indexed epochId, uint256 amount, uint256 totalPoolAmount)',
  'event DaoEpochFinalized(uint256 indexed epochId, uint256 totalPoolAmount, uint256 totalShares)',
  'event DaoRewardClaimed(address indexed user, uint256 indexed epochId, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp)',
  'event RewardRestaked(address indexed user, uint256 indexed newStakeId, uint256 amount, uint256 timestamp)',
  'event SolvencyWarning(uint256 totalOutstandingLiability, uint256 availableCapital)',
  'event DynamicRateUpdated(uint256 oldBps, uint256 newBps, uint256 surplusCapacity, uint256 totalStaked)',
  'event GlobalRewardAccrued(uint256 amount, uint256 newRewardIndex, uint256 annualBps)',
]);

export interface DaoEpoch {
  epochId: bigint;
  poolAmount: bigint;
  totalShares: bigint;
  startTime: bigint;
  endTime: bigint;
  isFinalized: boolean;
}

export interface RewardCapacity {
  availableCapital: bigint;
  liabilities: bigint;
  surplusCapacity: bigint;
  currentBps: bigint;
}

export interface DaoLeaderShares {
  leaders: `0x${string}`[];
  shares: bigint[];
  totalShares: bigint;
}
