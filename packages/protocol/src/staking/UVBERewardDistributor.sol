// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import '../interfaces/IUVBEStakingMLM.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVBERewardDistributor
 * @notice Solvent dynamic recurring reward system, multi-tier generation commission, rank bonus, and DAO leadership pool engine
 * @dev Enforces strict reward reserve solvency invariants, dynamic reward capacity calculations, and zero-minting guarantees.
 */
contract UVBERewardDistributor is IUVBERewardDistributor, AccessControl, ReentrancyGuard, Pausable {
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant override MAX_RECURRING_ANNUAL_BPS = 10_000; // 100.00% maximum annual APY ceiling
  uint256 public constant SECONDS_PER_YEAR = 31_536_000; // 365 days
  uint256 public constant DAO_POOL_BPS = 100; // 1.00% to DAO leadership pool
  uint256 public constant DAO_CYCLE_DURATION = 30 days;
  uint256 public constant INDEX_PRECISION = 1e18; // WAD scaling for cumulative reward index

  address public immutable override token;
  address public override reserve;
  address public override vault;
  address public override registry;

  uint256 private _totalOutstandingLiabilities;
  uint256 private _currentEpochId;
  uint256 private _currentEpochStartTime;
  uint256 private _currentEpochPoolAmount;

  mapping(address => uint256) private _claimableRecurring;
  mapping(address => uint256) private _lastRecurringAccrualTime;
  mapping(address => uint256) private _claimableDirect;
  mapping(address => uint256) private _claimableGeneration;
  mapping(address => uint256) private _claimableRank;
  mapping(address => uint256) private _claimableDao;
  mapping(address => uint256) private _totalClaimed;
  mapping(address => uint256) private _totalRestaked;

  mapping(uint256 => IUVBEStakingMLM.DaoEpoch) private _daoEpochs;
  mapping(address => mapping(uint256 => bool)) private _claimedDaoEpoch;
  mapping(uint256 => mapping(address => uint256)) private _epochUserShares;

  // --- Dynamic APY Accumulator State Variables ---
  uint256 public override rewardIndex;
  uint256 public override lastUpdateTimestamp;
  uint256 public currentAnnualBps;
  mapping(address => uint256) private _userRewardIndex;

  error UnauthorizedVault(address caller);
  error ModuleAlreadyInitialized();
  error InsufficientRewardBalance(uint256 requested, uint256 available);
  error SolvencyViolation(uint256 required, uint256 available);
  error EpochNotEnded(uint256 epochId, uint256 currentTimestamp, uint256 epochEndTime);
  error EpochAlreadyClaimed(address user, uint256 epochId);
  error EpochAlreadyFinalized(uint256 epochId);
  error NoEligibleShares();
  error ZeroAddress();
  error ZeroAmount();

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
  event RankRewardAccrued(address indexed user, uint8 rankId, uint256 amount);
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
  event SolvencyWarning(uint256 totalOutstandingLiability, uint256 reserveBalance);
  event DynamicRateUpdated(
    uint256 oldBps,
    uint256 newBps,
    uint256 surplusCapacity,
    uint256 totalStaked
  );
  event GlobalRewardAccrued(uint256 amount, uint256 newRewardIndex, uint256 annualBps);

  modifier onlyVault() {
    if (msg.sender != vault) revert UnauthorizedVault(msg.sender);
    _;
  }

  constructor(address admin, address tokenAddress) {
    if (admin == address(0) || tokenAddress == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(AccessRoles.GUARDIAN_ROLE, admin);

    token = tokenAddress;
    _currentEpochId = 1;
    _currentEpochStartTime = block.timestamp;
    lastUpdateTimestamp = block.timestamp;
  }

  /**
   * @notice Sets authorized module addresses exactly once, freezing them permanently
   */
  function setModules(
    address reserveAddress,
    address vaultAddress,
    address registryAddress
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (reserve != address(0) || vault != address(0) || registry != address(0)) {
      revert ModuleAlreadyInitialized();
    }
    if (
      reserveAddress == address(0) || vaultAddress == address(0) || registryAddress == address(0)
    ) {
      revert ZeroAddress();
    }
    reserve = reserveAddress;
    vault = vaultAddress;
    registry = registryAddress;

    lastUpdateTimestamp = block.timestamp;
  }

  /**
   * @notice Public checkpoint to synchronize global reward index and update dynamic rate
   */
  function checkpoint() external override nonReentrant whenNotPaused {
    _updateGlobalIndex();
  }

  /**
   * @notice Computes and distributes generation commissions and DAO pool allocation on stake
   * @dev Frozen Rule: If isRestake == true, restaked rewards are NOT commission-generating.
   */
  function distributeCommissions(
    address staker,
    uint256 amount,
    bool isRestake
  ) external override onlyVault nonReentrant whenNotPaused {
    if (amount == 0) return;

    // 1. Synchronize staker's previous stake and global index before applying new stake capacity
    _synchronizeStakerOnStake(staker, amount);

    // 2. Restake check: Restaked rewards never generate referral commissions or DAO pool allocation
    if (isRestake) return;

    // 3. Check total commission demand against available reward reserve
    uint256 maxPossibleDemand = (amount * 1300) / BPS_DENOMINATOR; // 12% generations + 1% DAO = 13%
    uint256 availableReserve = IUVBERewardReserve(reserve).getAvailableReserve();

    if (_totalOutstandingLiabilities + maxPossibleDemand > availableReserve) {
      emit SolvencyWarning(_totalOutstandingLiabilities + maxPossibleDemand, availableReserve);
      // Limit accrual to available solvency
      if (_totalOutstandingLiabilities >= availableReserve) return;
    }

    // 4. Fund DAO Leadership Pool (1.00%)
    uint256 daoAmount = (amount * DAO_POOL_BPS) / BPS_DENOMINATOR;
    _currentEpochPoolAmount += daoAmount;
    _totalOutstandingLiabilities += daoAmount;
    emit DaoPoolFunded(_currentEpochId, daoAmount, _currentEpochPoolAmount);

    // 5. Distribute 10-Generation Commissions (Gen 1 IS the 5% Direct Referral)
    address current = IUVBEReferralRegistry(registry).getReferrer(staker);
    address genesis = IUVBEReferralRegistry(registry).genesisReferrer();

    for (uint8 gen = 1; gen <= 10 && current != address(0); gen++) {
      uint256 genBps = _getGenerationBps(gen);
      uint256 commission = (amount * genBps) / BPS_DENOMINATOR;

      if (commission > 0 && _isQualifiedForGeneration(current, gen)) {
        if (gen == 1) {
          _claimableDirect[current] += commission;
          emit DirectRewardAccrued(current, staker, commission);
        } else {
          _claimableGeneration[current] += commission;
          emit GenerationRewardAccrued(current, staker, gen, commission);
        }
        _totalOutstandingLiabilities += commission;
      }

      if (current == genesis) break;
      current = IUVBEReferralRegistry(registry).getReferrer(current);
    }

    // 6. Re-evaluate dynamic annual rate prospectively after liabilities increase
    uint256 totalStaked = IUVBEStakingVault(vault).totalPermanentStaked();
    uint256 oldBps = currentAnnualBps;
    uint256 newBps = _calculateDynamicAnnualBps(totalStaked);
    currentAnnualBps = newBps;

    if (oldBps != newBps) {
      uint256 surplus =
        availableReserve > _totalOutstandingLiabilities
          ? availableReserve - _totalOutstandingLiabilities
          : 0;
      emit DynamicRateUpdated(oldBps, newBps, surplus, totalStaked);
    }
  }

  /**
   * @notice Synchronizes user's personal claimable recurring rewards with the global index
   */
  function accrueRecurringReward(address user) external override nonReentrant whenNotPaused {
    _synchronizeUserReward(user);
  }

  // --- User Claim & Restake Functions ---

  /**
   * @notice Claims a specific amount of accrued rewards directly into user wallet
   */
  function claimRewards(uint256 amount) external override nonReentrant whenNotPaused {
    _executeClaim(msg.sender, amount);
  }

  /**
   * @notice Claims all accrued rewards into user wallet
   */
  function claimAllRewards() external override nonReentrant whenNotPaused {
    _synchronizeUserReward(msg.sender);
    uint256 total = _getTotalClaimable(msg.sender);
    _executeClaim(msg.sender, total);
  }

  /**
   * @notice Restakes a specific amount of claimable rewards into permanent principal
   */
  function restakeRewards(uint256 amount) external override nonReentrant whenNotPaused {
    _executeRestake(msg.sender, amount);
  }

  /**
   * @notice Restakes all claimable rewards into permanent principal
   */
  function restakeAllRewards() external override nonReentrant whenNotPaused {
    _synchronizeUserReward(msg.sender);
    uint256 total = _getTotalClaimable(msg.sender);
    _executeRestake(msg.sender, total);
  }

  // --- DAO Epoch Distribution ---

  /**
   * @notice Finalizes a completed 30-day DAO leadership cycle and snapshots eligible leader shares
   */
  function finalizeDaoEpoch(uint256 epochId) external override nonReentrant whenNotPaused {
    if (epochId != _currentEpochId) revert EpochAlreadyFinalized(epochId);
    uint256 epochEndTime = _currentEpochStartTime + DAO_CYCLE_DURATION;
    if (block.timestamp < epochEndTime) {
      revert EpochNotEnded(epochId, block.timestamp, epochEndTime);
    }

    // 1. Snapshot eligible DAO leaders and compute total eligible shares via internal helper
    uint256 totalShares = _snapshotEpochLeaders(epochId);

    // 2. If no eligible leaders exist, roll over funds into the next epoch
    uint256 finalizedPool = 0;
    if (totalShares > 0) {
      finalizedPool = _currentEpochPoolAmount;
      _currentEpochPoolAmount = 0;
    }

    _daoEpochs[epochId] = IUVBEStakingMLM.DaoEpoch({
      epochId: epochId,
      poolAmount: finalizedPool,
      totalShares: totalShares,
      startTime: _currentEpochStartTime,
      endTime: epochEndTime,
      isFinalized: true
    });

    emit DaoEpochFinalized(epochId, finalizedPool, totalShares);

    // 3. Advance to next epoch
    _currentEpochId++;
    _currentEpochStartTime = block.timestamp;
  }

  function _snapshotEpochLeaders(uint256 epochId) internal returns (uint256 totalShares) {
    (address[] memory leaders, uint256[] memory shares, uint256 sumShares) = IUVBEReferralRegistry(
      registry
    ).getDaoLeaderShares();
    uint256 len = leaders.length;
    for (uint256 i = 0; i < len; ) {
      if (shares[i] > 0) {
        _epochUserShares[epochId][leaders[i]] = shares[i];
      }
      unchecked {
        ++i;
      }
    }
    return sumShares;
  }

  /**
   * @notice Claims pro-rata share of a finalized DAO leadership epoch based on snapshotted shares
   */
  function claimDaoEpochReward(uint256 epochId) external override nonReentrant whenNotPaused {
    if (!_daoEpochs[epochId].isFinalized) revert EpochNotEnded(epochId, block.timestamp, 0);
    if (_claimedDaoEpoch[msg.sender][epochId]) revert EpochAlreadyClaimed(msg.sender, epochId);

    uint256 userShares = _epochUserShares[epochId][msg.sender];
    uint256 totalShares = _daoEpochs[epochId].totalShares;
    if (userShares == 0 || totalShares == 0) revert NoEligibleShares();

    _claimedDaoEpoch[msg.sender][epochId] = true;

    // Mathematical Guarantee: sum(claims) <= poolAmount due to integer division truncation
    uint256 rewardAmount = (_daoEpochs[epochId].poolAmount * userShares) / totalShares;
    if (rewardAmount > 0) {
      _claimableDao[msg.sender] += rewardAmount;
      emit DaoRewardClaimed(msg.sender, epochId, rewardAmount);
    }
  }

  // --- Dynamic APY Accumulator Core Logic ---

  function _updateGlobalIndex() internal {
    uint256 currentTimestamp = block.timestamp;
    uint256 totalStaked = vault != address(0) ? IUVBEStakingVault(vault).totalPermanentStaked() : 0;

    if (currentTimestamp > lastUpdateTimestamp) {
      uint256 timeDelta = currentTimestamp - lastUpdateTimestamp;

      if (timeDelta > 0 && totalStaked > 0 && currentAnnualBps > 0) {
        uint256 deltaIndex =
          (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
        rewardIndex += deltaIndex;

        uint256 accruedLiab = (totalStaked * deltaIndex) / INDEX_PRECISION;
        _totalOutstandingLiabilities += accruedLiab;
        emit GlobalRewardAccrued(accruedLiab, rewardIndex, currentAnnualBps);
      }

      lastUpdateTimestamp = currentTimestamp;
    }

    // Re-calculate dynamic rate prospectively
    uint256 oldBps = currentAnnualBps;
    uint256 newBps = _calculateDynamicAnnualBps(totalStaked);
    currentAnnualBps = newBps;

    if (oldBps != newBps) {
      uint256 availableReserve =
        reserve != address(0) ? IUVBERewardReserve(reserve).getAvailableReserve() : 0;
      uint256 surplus =
        availableReserve > _totalOutstandingLiabilities
          ? availableReserve - _totalOutstandingLiabilities
          : 0;
      emit DynamicRateUpdated(oldBps, newBps, surplus, totalStaked);
    }
  }

  function _synchronizeUserReward(address user) internal {
    _updateGlobalIndex();

    if (user == address(0) || vault == address(0)) return;

    uint256 userStake = IUVBEStakingVault(vault).getPermanentStake(user);
    if (userStake > 0) {
      uint256 userIdx = _userRewardIndex[user];
      if (userIdx < rewardIndex) {
        uint256 deltaIdx = rewardIndex - userIdx;
        uint256 pending = (userStake * deltaIdx) / INDEX_PRECISION;
        if (pending > 0) {
          _claimableRecurring[user] += pending;
          emit RecurringRewardAccrued(user, pending, _claimableRecurring[user]);
        }
      }
    }
    _userRewardIndex[user] = rewardIndex;
  }

  function _synchronizeStakerOnStake(address staker, uint256 addedPrincipal) internal {
    uint256 currentTimestamp = block.timestamp;
    if (currentTimestamp > lastUpdateTimestamp && vault != address(0)) {
      uint256 timeDelta = currentTimestamp - lastUpdateTimestamp;
      uint256 currentVaultTotal = IUVBEStakingVault(vault).totalPermanentStaked();
      uint256 preStakeTotal =
        currentVaultTotal >= addedPrincipal ? currentVaultTotal - addedPrincipal : 0;

      if (timeDelta > 0 && preStakeTotal > 0 && currentAnnualBps > 0) {
        uint256 deltaIndex =
          (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
        rewardIndex += deltaIndex;
        uint256 accruedLiab = (preStakeTotal * deltaIndex) / INDEX_PRECISION;
        _totalOutstandingLiabilities += accruedLiab;
        emit GlobalRewardAccrued(accruedLiab, rewardIndex, currentAnnualBps);
      }
      lastUpdateTimestamp = currentTimestamp;
    }

    if (staker != address(0) && vault != address(0)) {
      uint256 currentVaultUserStake = IUVBEStakingVault(vault).getPermanentStake(staker);
      uint256 preUserStake =
        currentVaultUserStake >= addedPrincipal ? currentVaultUserStake - addedPrincipal : 0;

      if (preUserStake > 0) {
        uint256 userIdx = _userRewardIndex[staker];
        if (userIdx < rewardIndex) {
          uint256 deltaIdx = rewardIndex - userIdx;
          uint256 pending = (preUserStake * deltaIdx) / INDEX_PRECISION;
          if (pending > 0) {
            _claimableRecurring[staker] += pending;
            emit RecurringRewardAccrued(staker, pending, _claimableRecurring[staker]);
          }
        }
      }
      _userRewardIndex[staker] = rewardIndex;
    }

    // Re-calculate dynamic rate prospectively for the new total staked
    uint256 newTotalStaked =
      vault != address(0) ? IUVBEStakingVault(vault).totalPermanentStaked() : 0;
    uint256 oldBps = currentAnnualBps;
    uint256 newBps = _calculateDynamicAnnualBps(newTotalStaked);
    currentAnnualBps = newBps;

    if (oldBps != newBps) {
      uint256 availableReserve =
        reserve != address(0) ? IUVBERewardReserve(reserve).getAvailableReserve() : 0;
      uint256 surplus =
        availableReserve > _totalOutstandingLiabilities
          ? availableReserve - _totalOutstandingLiabilities
          : 0;
      emit DynamicRateUpdated(oldBps, newBps, surplus, newTotalStaked);
    }
  }

  function _calculateDynamicAnnualBps(uint256 totalStaked) internal view returns (uint256) {
    if (totalStaked == 0 || reserve == address(0)) {
      return 0;
    }

    uint256 availableReserve = IUVBERewardReserve(reserve).getAvailableReserve();
    if (availableReserve <= _totalOutstandingLiabilities) {
      return 0; // Solvency depletion: 0% APY
    }

    uint256 surplusCapacity = availableReserve - _totalOutstandingLiabilities;

    // Annual capacity in BPS: (surplusCapacity * BPS_DENOMINATOR) / totalStaked
    uint256 calculatedBps = (surplusCapacity * BPS_DENOMINATOR) / totalStaked;

    if (calculatedBps > MAX_RECURRING_ANNUAL_BPS) {
      return MAX_RECURRING_ANNUAL_BPS; // Cap at 100.00% max ceiling (10000 BPS)
    }
    return calculatedBps;
  }

  // --- Internal Claim & Restake Handlers ---

  function _executeClaim(address user, uint256 amount) internal {
    if (amount == 0) revert ZeroAmount();

    _synchronizeUserReward(user);

    uint256 available = _getTotalClaimable(user);
    if (amount > available) revert InsufficientRewardBalance(amount, available);

    // 1. Deduct liability (CEI)
    _deductClaimable(user, amount);
    _totalClaimed[user] += amount;
    _totalOutstandingLiabilities -= amount;

    // 2. Disburse UVBE from reserve directly to user wallet
    IUVBERewardReserve(reserve).disburseReward(user, amount);

    // 3. Re-evaluate rate prospectively (surplus capacity is preserved)
    uint256 totalStaked = IUVBEStakingVault(vault).totalPermanentStaked();
    currentAnnualBps = _calculateDynamicAnnualBps(totalStaked);

    emit RewardClaimed(user, amount, block.timestamp);
  }

  function _executeRestake(address user, uint256 amount) internal {
    if (amount == 0) revert ZeroAmount();

    _synchronizeUserReward(user);

    uint256 available = _getTotalClaimable(user);
    if (amount > available) revert InsufficientRewardBalance(amount, available);

    // 1. Deduct liability (CEI)
    _deductClaimable(user, amount);
    _totalRestaked[user] += amount;
    _totalOutstandingLiabilities -= amount;

    // 2. Direct Internal Transfer: Reserve -> StakingVault
    IUVBERewardReserve(reserve).transferToVault(vault, amount);

    // 3. Record new permanent principal in vault
    IUVBEStakingVault(vault).recordRestake(user, amount);

    // 4. Staker's reward index is updated to current index for the newly added restake amount
    _userRewardIndex[user] = rewardIndex;

    // 5. Re-evaluate rate prospectively for expanded staking base
    uint256 newTotalStaked = IUVBEStakingVault(vault).totalPermanentStaked();
    currentAnnualBps = _calculateDynamicAnnualBps(newTotalStaked);

    emit RewardRestaked(user, 0, amount, block.timestamp);
  }

  function _deductClaimable(address user, uint256 amount) internal {
    uint256 remaining = amount;

    if (_claimableRecurring[user] > 0) {
      uint256 rec = Math.min(_claimableRecurring[user], remaining);
      _claimableRecurring[user] -= rec;
      remaining -= rec;
    }
    if (remaining > 0 && _claimableDirect[user] > 0) {
      uint256 d = Math.min(_claimableDirect[user], remaining);
      _claimableDirect[user] -= d;
      remaining -= d;
    }
    if (remaining > 0 && _claimableGeneration[user] > 0) {
      uint256 g = Math.min(_claimableGeneration[user], remaining);
      _claimableGeneration[user] -= g;
      remaining -= g;
    }
    if (remaining > 0 && _claimableRank[user] > 0) {
      uint256 r = Math.min(_claimableRank[user], remaining);
      _claimableRank[user] -= r;
      remaining -= r;
    }
    if (remaining > 0 && _claimableDao[user] > 0) {
      uint256 dao = Math.min(_claimableDao[user], remaining);
      _claimableDao[user] -= dao;
      remaining -= dao;
    }
  }

  function _getTotalClaimable(address user) internal view returns (uint256) {
    return
      _claimableRecurring[user] +
      _claimableDirect[user] +
      _claimableGeneration[user] +
      _claimableRank[user] +
      _claimableDao[user];
  }

  function _getGenerationBps(uint8 gen) internal pure returns (uint256) {
    if (gen == 1) return 500; // Gen 1 (Direct): 5.00%
    if (gen == 2) return 200; // Gen 2: 2.00%
    if (gen == 3) return 150; // Gen 3: 1.50%
    if (gen == 4) return 100; // Gen 4: 1.00%
    if (gen == 5) return 75; // Gen 5: 0.75%
    if (gen == 6) return 50; // Gen 6: 0.50%
    if (gen == 7) return 50; // Gen 7: 0.50%
    if (gen == 8) return 25; // Gen 8: 0.25%
    if (gen == 9) return 25; // Gen 9: 0.25%
    if (gen == 10) return 25; // Gen 10: 0.25%
    return 0;
  }

  function _isQualifiedForGeneration(address user, uint8 gen) internal view returns (bool) {
    if (user == address(0) || registry == address(0) || vault == address(0)) return false;

    uint256 stake = IUVBEStakingVault(vault).getPermanentStake(user);
    uint256 directs = IUVBEReferralRegistry(registry).getActiveDirectCount(user);

    if (gen == 1) return directs >= 1 && stake >= 50 * 1e18;
    if (gen <= 3) return directs >= 2 && stake >= 100 * 1e18;
    if (gen <= 5) return directs >= 3 && stake >= 250 * 1e18;
    if (gen <= 7) return directs >= 4 && stake >= 500 * 1e18;
    if (gen <= 10) return directs >= 5 && stake >= 1_000 * 1e18;
    return false;
  }

  function _getDaoSharesForRank(uint8 rank) internal pure returns (uint256) {
    if (rank == 4) return 1; // Platinum: 1 share
    if (rank == 5) return 3; // Diamond: 3 shares
    if (rank == 6) return 10; // Crown Ambassador: 10 shares
    return 0;
  }

  // --- View Methods ---

  /**
   * @notice Returns total claimable rewards including pending virtual recurring accruals
   */
  function getClaimableRewards(address user) external view override returns (uint256) {
    return
      getPendingRecurringReward(user) +
      _claimableDirect[user] +
      _claimableGeneration[user] +
      _claimableRank[user] +
      _claimableDao[user];
  }

  /**
   * @notice Calculates real-time pending recurring rewards for a user up to block.timestamp
   */
  function getPendingRecurringReward(address user) public view override returns (uint256) {
    uint256 userStake = vault != address(0) ? IUVBEStakingVault(vault).getPermanentStake(user) : 0;
    if (userStake == 0) return _claimableRecurring[user];

    uint256 currentTimestamp = block.timestamp;
    uint256 timeDelta =
      currentTimestamp > lastUpdateTimestamp ? currentTimestamp - lastUpdateTimestamp : 0;

    uint256 virtualIndex = rewardIndex;
    if (timeDelta > 0 && currentAnnualBps > 0) {
      uint256 deltaIndex =
        (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
      virtualIndex += deltaIndex;
    }

    uint256 userIdx = _userRewardIndex[user];
    uint256 pending = 0;
    if (userIdx < virtualIndex) {
      pending = (userStake * (virtualIndex - userIdx)) / INDEX_PRECISION;
    }
    return _claimableRecurring[user] + pending;
  }

  /**
   * @notice Returns the currently active dynamic annual BPS rate
   */
  function getCurrentAnnualBps() external view override returns (uint256) {
    return currentAnnualBps;
  }

  /**
   * @notice Returns the active dynamic annual BPS rate (backward-compatible view)
   */
  function RECURRING_ANNUAL_BPS() external view override returns (uint256) {
    return currentAnnualBps;
  }

  /**
   * @notice Returns detailed reward breakdown and economic capacity metrics
   */
  function getRewardCapacity()
    external
    view
    override
    returns (
      uint256 availableReserve,
      uint256 liabilities,
      uint256 surplusCapacity,
      uint256 currentBps
    )
  {
    availableReserve =
      reserve != address(0) ? IUVBERewardReserve(reserve).getAvailableReserve() : 0;

    uint256 pendingGlobalLiab = 0;
    uint256 currentTimestamp = block.timestamp;
    if (currentTimestamp > lastUpdateTimestamp && vault != address(0)) {
      uint256 totalStaked = IUVBEStakingVault(vault).totalPermanentStaked();
      if (totalStaked > 0 && currentAnnualBps > 0) {
        uint256 timeDelta = currentTimestamp - lastUpdateTimestamp;
        uint256 deltaIndex =
          (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
        pendingGlobalLiab = (totalStaked * deltaIndex) / INDEX_PRECISION;
      }
    }

    liabilities = _totalOutstandingLiabilities + pendingGlobalLiab;
    surplusCapacity = availableReserve > liabilities ? availableReserve - liabilities : 0;

    uint256 totalStakedNow =
      vault != address(0) ? IUVBEStakingVault(vault).totalPermanentStaked() : 0;
    currentBps =
      (totalStakedNow > 0 && surplusCapacity > 0)
        ? Math.min(MAX_RECURRING_ANNUAL_BPS, (surplusCapacity * BPS_DENOMINATOR) / totalStakedNow)
        : 0;
  }

  function getDetailedRewardInfo(
    address user
  )
    external
    view
    override
    returns (
      uint256 recurringReward,
      uint256 directReward,
      uint256 generationReward,
      uint256 rankReward,
      uint256 daoReward,
      uint256 totalClaimable,
      uint256 totalClaimed,
      uint256 totalRestaked
    )
  {
    recurringReward = getPendingRecurringReward(user);
    directReward = _claimableDirect[user];
    generationReward = _claimableGeneration[user];
    rankReward = _claimableRank[user];
    daoReward = _claimableDao[user];
    totalClaimable = recurringReward + directReward + generationReward + rankReward + daoReward;
    totalClaimed = _totalClaimed[user];
    totalRestaked = _totalRestaked[user];
  }

  function totalOutstandingLiabilities() external view override returns (uint256) {
    return _totalOutstandingLiabilities;
  }

  function currentDaoEpochId() external view override returns (uint256) {
    return _currentEpochId;
  }

  // --- Emergency Controls ---

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
