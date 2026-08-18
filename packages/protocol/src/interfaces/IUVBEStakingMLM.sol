// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IUVBEStakingMLM
 * @notice Unified interface and data types for the independent permanent UVBE Staking & MLM subsystem
 * @dev Staked UVBE principal is permanently locked forever. Rewards are funded exclusively from already-minted UVBE.
 */
interface IUVBEStakingMLM {
  // --- Structs ---

  struct StakeRecord {
    uint256 amount;
    uint256 stakedAt;
  }

  struct UserStakeInfo {
    uint256 totalPermanentStake;
    uint256 initialStakeTimestamp;
    uint256 stakeCount;
  }

  struct UserReferralInfo {
    address referrer;
    uint256 directCount;
    uint256 activeDirectCount;
    uint256 teamVolume;
    uint8 rank;
    bool isRegistered;
  }

  struct UserRewardInfo {
    uint256 claimableRecurring;
    uint256 claimableDirect;
    uint256 claimableGeneration;
    uint256 claimableRank;
    uint256 claimableDao;
    uint256 totalClaimable;
    uint256 totalClaimed;
    uint256 totalRestaked;
  }

  struct RankConfig {
    uint8 rankId;
    string name;
    uint256 minPersonalStake;
    uint256 activeDirectsRequired;
    uint256 teamVolumeRequired;
    uint256 milestoneReward;
  }

  struct DaoEpoch {
    uint256 epochId;
    uint256 poolAmount;
    uint256 totalShares;
    uint256 startTime;
    uint256 endTime;
    bool isFinalized;
  }

  // --- Errors ---

  error BelowMinStake(uint256 provided, uint256 minimum);
  error ExceedsMaxStake(uint256 provided, uint256 maximum);
  error SelfReferralProhibited();
  error CircularReferralDetected(address cyclicAncestor);
  error ReferrerAlreadySet(address existingReferrer);
  error InsufficientRewardBalance(uint256 requested, uint256 available);
  error ZeroAmount();
  error ZeroAddress();
  error UnauthorizedCaller(address caller);
  error UnauthorizedDistributor(address caller);
  error UnauthorizedVault(address caller);
  error UnauthorizedRegistry(address caller);
  error EpochNotEnded(uint256 epochId, uint256 currentTimestamp, uint256 epochEndTime);
  error EpochAlreadyClaimed(address user, uint256 epochId);
  error NoEligibleShares();
  error SolvencyViolation(uint256 liability, uint256 reserveBalance);

  // --- Events ---

  event StakeCreated(
    address indexed user,
    uint256 indexed stakeId,
    uint256 amount,
    address indexed referrer
  );
  event PermanentStakeIncreased(
    address indexed user,
    uint256 indexed stakeId,
    uint256 amount,
    bool isRestake
  );
  event ReferralRegistered(address indexed user, address indexed referrer, uint256 timestamp);
  event RecurringRewardAccrued(
    address indexed user,
    uint256 amount,
    uint256 totalClaimableRecurring
  );
  event DirectRewardAccrued(address indexed beneficiary, address indexed fromUser, uint256 amount);
  event GenerationRewardAccrued(
    address indexed beneficiary,
    address indexed fromUser,
    uint8 generation,
    uint256 amount
  );
  event RankAchieved(address indexed user, uint8 rankId, uint256 milestoneReward);
  event DaoPoolFunded(uint256 indexed epochId, uint256 amount, uint256 totalPoolAmount);
  event DaoEpochFinalized(uint256 indexed epochId, uint256 totalPoolAmount, uint256 totalShares);
  event DaoRewardClaimed(address indexed user, uint256 indexed epochId, uint256 amount);
  event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp);
  event RewardRestaked(
    address indexed user,
    uint256 indexed newStakeId,
    uint256 amount,
    uint256 timestamp
  );
  event RewardReserveFunded(address indexed funder, uint256 amount, uint256 newReserveBalance);
  event SolvencyWarning(uint256 totalOutstandingLiability, uint256 reserveBalance);
}

interface IUVBERewardReserve {
  function token() external view returns (address);
  function distributor() external view returns (address);
  function depositRewardFunds(uint256 amount) external;
  function disburseReward(address recipient, uint256 amount) external;
  function transferToVault(address vault, uint256 amount) external;
  function getAvailableReserve() external view returns (uint256);
}

interface IUVBEStakingVault {
  function token() external view returns (address);
  function registry() external view returns (address);
  function distributor() external view returns (address);
  function stake(uint256 amount, address referrer) external;
  function stakeWithPermit(
    uint256 amount,
    address referrer,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;
  function recordRestake(address user, uint256 amount) external;
  function getPermanentStake(address user) external view returns (uint256);
  function getStakeRecord(
    address user,
    uint256 index
  ) external view returns (uint256 amount, uint256 stakedAt);
  function getStakeCount(address user) external view returns (uint256);
  function totalPermanentStaked() external view returns (uint256);
}

interface IUVBEReferralRegistry {
  function genesisReferrer() external view returns (address);
  function vault() external view returns (address);
  function distributor() external view returns (address);
  function recordStake(address user, uint256 amount, address referrer, bool isRestake) external;
  function getReferrer(address user) external view returns (address);
  function getDirects(address user) external view returns (address[] memory);
  function getActiveDirectCount(address user) external view returns (uint256);
  function getTeamVolume(address user) external view returns (uint256);
  function getRank(address user) external view returns (uint8);
  function getUplineChain(address user, uint8 maxDepth) external view returns (address[] memory);
  function isUserActive(address user) external view returns (bool);
  function getDaoLeaders() external view returns (address[] memory);
  function getDaoLeaderShares()
    external
    view
    returns (address[] memory leaders, uint256[] memory shares, uint256 totalShares);
}

interface IUVBERewardDistributor {
  function token() external view returns (address);
  function reserve() external view returns (address);
  function vault() external view returns (address);
  function registry() external view returns (address);
  function distributeCommissions(address staker, uint256 amount, bool isRestake) external;
  function accrueRecurringReward(address user) external;
  function claimRewards(uint256 amount) external;
  function claimAllRewards() external;
  function restakeRewards(uint256 amount) external;
  function restakeAllRewards() external;
  function finalizeDaoEpoch(uint256 epochId) external;
  function claimDaoEpochReward(uint256 epochId) external;
  function getClaimableRewards(address user) external view returns (uint256);
  function getDetailedRewardInfo(
    address user
  )
    external
    view
    returns (
      uint256 recurringReward,
      uint256 directReward,
      uint256 generationReward,
      uint256 rankReward,
      uint256 daoReward,
      uint256 totalClaimable,
      uint256 totalClaimed,
      uint256 totalRestaked
    );
  function totalOutstandingLiabilities() external view returns (uint256);
  function currentDaoEpochId() external view returns (uint256);
}
