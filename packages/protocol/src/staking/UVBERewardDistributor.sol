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
 * @dev Enforces strict protocol capital solvency invariants, dynamic reward capacity calculations, and zero-minting guarantees.
 * Rewards are funded directly from protocol-owned staking capital held in UVBEStakingVault.
 */
contract UVBERewardDistributor is IUVBERewardDistributor, AccessControl, ReentrancyGuard, Pausable {
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant override MAX_RECURRING_ANNUAL_BPS = 60_000; // 600.00% maximum annual APY ceiling
  uint256 public constant SECONDS_PER_YEAR = 31_536_000; // 365 days
  uint256 public constant DAO_POOL_BPS = 500; // 5.00% to DAO leadership pool
  uint256 public constant NON_REFERRAL_MAX_CAP_MULTIPLIER = 2; // 2x lifetime earnings cap for stakers with 0 active directs
  uint256 public constant REFERRAL_MAX_CAP_MULTIPLIER = 3; // 3x lifetime earnings cap for stakers with >=1 active directs
  uint256 public constant DAO_CYCLE_DURATION = 30 days;
  uint256 public constant INDEX_PRECISION = 1e18; // WAD scaling for cumulative reward index

  address public immutable override token;
  address public override vault;
  address public override registry;

  uint256 private _totalOutstandingLiabilities;
  uint256 private _totalRewardPaid;
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
  event SolvencyWarning(uint256 totalOutstandingLiability, uint256 availableCapital);
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
    address vaultAddress,
    address registryAddress
  ) public onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (vault != address(0) || registry != address(0)) {
      revert ModuleAlreadyInitialized();
    }
    if (vaultAddress == address(0) || registryAddress == address(0)) {
      revert ZeroAddress();
    }
    vault = vaultAddress;
    registry = registryAddress;

    lastUpdateTimestamp = block.timestamp;
  }

  /**
   * @notice 3-arg overload for backwards compatibility
   */
  function setModules(
    address,
    /* reserveAddress */
    address vaultAddress,
    address registryAddress
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    setModules(vaultAddress, registryAddress);
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

    // 3. Check total commission demand against available protocol capital in vault
    uint256 maxPossibleDemand = (amount * 1700) / BPS_DENOMINATOR; // 12% generations + 5% DAO = 17%
    uint256 availableCapital = IUVBEStakingVault(vault).getAvailableProtocolCapital();

    if (_totalOutstandingLiabilities + maxPossibleDemand > availableCapital) {
      emit SolvencyWarning(_totalOutstandingLiabilities + maxPossibleDemand, availableCapital);
      // Limit accrual to available solvency
      if (_totalOutstandingLiabilities >= availableCapital) return;
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
        availableCapital > _totalOutstandingLiabilities
          ? availableCapital - _totalOutstandingLiabilities
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

        uint256 accruedLiab = (totalStaked * deltaIndex) / INDEX_PRECISION;

        // Hard Solvency Guarantee: Accrual can never exceed available surplus capital
        uint256 availableCapital =
          vault != address(0) ? IUVBEStakingVault(vault).getAvailableProtocolCapital() : 0;
        uint256 surplus =
          availableCapital > _totalOutstandingLiabilities
            ? availableCapital - _totalOutstandingLiabilities
            : 0;

        if (accruedLiab > surplus) {
          accruedLiab = surplus;
          deltaIndex = (surplus * INDEX_PRECISION) / totalStaked;
        }

        if (deltaIndex > 0) {
          rewardIndex += deltaIndex;
          _totalOutstandingLiabilities += accruedLiab;
          emit GlobalRewardAccrued(accruedLiab, rewardIndex, currentAnnualBps);
        }
      }

      lastUpdateTimestamp = currentTimestamp;
    }

    // Re-calculate dynamic rate prospectively
    uint256 oldBps = currentAnnualBps;
    uint256 newBps = _calculateDynamicAnnualBps(totalStaked);
    currentAnnualBps = newBps;

    if (oldBps != newBps) {
      uint256 availableCapital =
        vault != address(0) ? IUVBEStakingVault(vault).getAvailableProtocolCapital() : 0;
      uint256 surplus =
        availableCapital > _totalOutstandingLiabilities
          ? availableCapital - _totalOutstandingLiabilities
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

        // Lifetime Payout Cap check (2x for 0 directs, 3x for 1+ directs) based on Total Deposited Principal
        if (pending > 0 && registry != address(0)) {
          uint256 depositedPrincipal = IUVBEStakingVault(vault).getTotalDepositedPrincipal(user);
          if (depositedPrincipal > 0) {
            bool is3xQualified = IUVBEReferralRegistry(registry).hasUnlocked3x(user);
            uint256 multiplier =
              is3xQualified ? REFERRAL_MAX_CAP_MULTIPLIER : NON_REFERRAL_MAX_CAP_MULTIPLIER;
            uint256 maxEarnings = depositedPrincipal * multiplier;

            uint256 totalEarnedSoFar =
              _claimableRecurring[user] +
                _claimableDirect[user] +
                _claimableGeneration[user] +
                _claimableRank[user] +
                _claimableDao[user] +
                _totalClaimed[user] +
                _totalRestaked[user];

            if (totalEarnedSoFar >= maxEarnings) {
              pending = 0;
            } else if (totalEarnedSoFar + pending > maxEarnings) {
              pending = maxEarnings - totalEarnedSoFar;
            }
          }
        }

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
        uint256 accruedLiab = (preStakeTotal * deltaIndex) / INDEX_PRECISION;

        // Hard Solvency Guarantee
        uint256 availableCapital = IUVBEStakingVault(vault).getAvailableProtocolCapital();
        uint256 surplus =
          availableCapital > _totalOutstandingLiabilities
            ? availableCapital - _totalOutstandingLiabilities
            : 0;

        if (accruedLiab > surplus) {
          accruedLiab = surplus;
          deltaIndex = (surplus * INDEX_PRECISION) / preStakeTotal;
        }

        if (deltaIndex > 0) {
          rewardIndex += deltaIndex;
          _totalOutstandingLiabilities += accruedLiab;
          emit GlobalRewardAccrued(accruedLiab, rewardIndex, currentAnnualBps);
        }
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

          // Lifetime Payout Cap check based on pre-stake deposited principal
          if (pending > 0 && registry != address(0)) {
            uint256 currentDeposited = IUVBEStakingVault(vault).getTotalDepositedPrincipal(staker);
            uint256 preDeposited =
              currentDeposited >= addedPrincipal ? currentDeposited - addedPrincipal : 0;

            if (preDeposited > 0) {
              bool is3xQualified = IUVBEReferralRegistry(registry).hasUnlocked3x(staker);
              uint256 multiplier =
                is3xQualified ? REFERRAL_MAX_CAP_MULTIPLIER : NON_REFERRAL_MAX_CAP_MULTIPLIER;
              uint256 maxEarnings = preDeposited * multiplier;

              uint256 totalEarnedSoFar =
                _claimableRecurring[staker] +
                  _claimableDirect[staker] +
                  _claimableGeneration[staker] +
                  _claimableRank[staker] +
                  _claimableDao[staker] +
                  _totalClaimed[staker] +
                  _totalRestaked[staker];

              if (totalEarnedSoFar >= maxEarnings) {
                pending = 0;
              } else if (totalEarnedSoFar + pending > maxEarnings) {
                pending = maxEarnings - totalEarnedSoFar;
              }
            }
          }

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
      uint256 availableCapital =
        vault != address(0) ? IUVBEStakingVault(vault).getAvailableProtocolCapital() : 0;
      uint256 surplus =
        availableCapital > _totalOutstandingLiabilities
          ? availableCapital - _totalOutstandingLiabilities
          : 0;
      emit DynamicRateUpdated(oldBps, newBps, surplus, newTotalStaked);
    }
  }

  function _calculateDynamicAnnualBps(uint256 totalStaked) internal view returns (uint256) {
    if (totalStaked == 0 || vault == address(0)) {
      return 0;
    }

    uint256 availableCapital = IUVBEStakingVault(vault).getAvailableProtocolCapital();
    if (availableCapital <= _totalOutstandingLiabilities) {
      return 0; // Solvency depletion: 0% APY
    }

    uint256 surplusCapacity = availableCapital - _totalOutstandingLiabilities;

    // Annual capacity in BPS: (surplusCapacity * BPS_DENOMINATOR) / totalStaked
    uint256 calculatedBps = (surplusCapacity * BPS_DENOMINATOR) / totalStaked;

    if (calculatedBps > MAX_RECURRING_ANNUAL_BPS) {
      return MAX_RECURRING_ANNUAL_BPS; // Cap at 600.00% max ceiling (60000 BPS)
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
    _totalRewardPaid += amount;
    _totalOutstandingLiabilities -= amount;

    // 2. Disburse UVBE directly from protocol-owned capital in StakingVault to user wallet
    IUVBEStakingVault(vault).disburseReward(user, amount);

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

    // 2. Record new permanent principal in vault (tokens already in vault)
    IUVBEStakingVault(vault).recordRestake(user, amount);

    // 3. Staker's reward index is updated to current index for the newly added restake amount
    _userRewardIndex[user] = rewardIndex;

    // 4. Re-evaluate rate prospectively for expanded staking base
    uint256 newTotalStaked = IUVBEStakingVault(vault).totalPermanentStaked();
    currentAnnualBps = _calculateDynamicAnnualBps(newTotalStaked);

    emit RewardRestaked(user, 0, amount, block.timestamp);
  }

  function _deductClaimable(address user, uint256 amount) internal {
    uint256 remaining = amount;

    // Order: recurring -> direct -> generation -> rank -> dao
    if (_claimableRecurring[user] > 0 && remaining > 0) {
      uint256 take = Math.min(_claimableRecurring[user], remaining);
      _claimableRecurring[user] -= take;
      remaining -= take;
    }
    if (_claimableDirect[user] > 0 && remaining > 0) {
      uint256 take = Math.min(_claimableDirect[user], remaining);
      _claimableDirect[user] -= take;
      remaining -= take;
    }
    if (_claimableGeneration[user] > 0 && remaining > 0) {
      uint256 take = Math.min(_claimableGeneration[user], remaining);
      _claimableGeneration[user] -= take;
      remaining -= take;
    }
    if (_claimableRank[user] > 0 && remaining > 0) {
      uint256 take = Math.min(_claimableRank[user], remaining);
      _claimableRank[user] -= take;
      remaining -= take;
    }
    if (_claimableDao[user] > 0 && remaining > 0) {
      uint256 take = Math.min(_claimableDao[user], remaining);
      _claimableDao[user] -= take;
      remaining -= take;
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

  // --- Internal MLM Rate & Qualification Helpers ---

  function _getGenerationBps(uint8 gen) internal pure returns (uint256) {
    if (gen == 1) return 500; // 5.00%
    if (gen == 2) return 200; // 2.00%
    if (gen == 3) return 150; // 1.50%
    if (gen == 4) return 100; // 1.00%
    if (gen == 5) return 75; // 0.75%
    if (gen == 6) return 50; // 0.50%
    if (gen == 7) return 50; // 0.50%
    if (gen == 8) return 25; // 0.25%
    if (gen == 9) return 25; // 0.25%
    if (gen == 10) return 25; // 0.25%
    return 0;
  }

  function _isQualifiedForGeneration(address account, uint8 gen) internal view returns (bool) {
    if (account == address(0) || registry == address(0) || vault == address(0)) return false;

    // Genesis referrer is qualified for all 10 generations unconditionally
    if (account == IUVBEReferralRegistry(registry).genesisReferrer()) return true;

    // Gen 1 (Direct): Requires active direct status (personal stake >= 47.5 UVBE)
    if (gen == 1) {
      return IUVBEReferralRegistry(registry).isUserActive(account);
    }

    // Gen 2-10: Requires active directs threshold >= gen
    uint256 activeDirects = IUVBEReferralRegistry(registry).getActiveDirectCount(account);
    return activeDirects >= gen;
  }

  // --- View Methods ---

  function getClaimableRewards(address user) external view override returns (uint256) {
    uint256 pendingRec = getPendingRecurringReward(user);
    return _getTotalClaimable(user) + pendingRec;
  }

  function getPendingRecurringReward(address user) public view override returns (uint256) {
    if (user == address(0) || vault == address(0)) return 0;
    uint256 userStake = IUVBEStakingVault(vault).getPermanentStake(user);
    if (userStake == 0) return 0;

    uint256 simulatedIndex = rewardIndex;
    uint256 totalStaked = IUVBEStakingVault(vault).totalPermanentStaked();

    if (block.timestamp > lastUpdateTimestamp && totalStaked > 0 && currentAnnualBps > 0) {
      uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
      uint256 deltaIndex =
        (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);

      uint256 potentialLiab = (totalStaked * deltaIndex) / INDEX_PRECISION;
      uint256 availableCapital = IUVBEStakingVault(vault).getAvailableProtocolCapital();
      uint256 surplus =
        availableCapital > _totalOutstandingLiabilities
          ? availableCapital - _totalOutstandingLiabilities
          : 0;

      if (potentialLiab > surplus) {
        deltaIndex = (surplus * INDEX_PRECISION) / totalStaked;
      }
      simulatedIndex += deltaIndex;
    }

    uint256 userIdx = _userRewardIndex[user];
    if (simulatedIndex > userIdx) {
      uint256 pending = (userStake * (simulatedIndex - userIdx)) / INDEX_PRECISION;

      // Lifetime Payout Cap check (2x for 0 directs, 3x for 1+ directs) based on Total Deposited Principal
      if (pending > 0 && registry != address(0)) {
        uint256 depositedPrincipal = IUVBEStakingVault(vault).getTotalDepositedPrincipal(user);
        if (depositedPrincipal > 0) {
          bool is3xQualified = IUVBEReferralRegistry(registry).hasUnlocked3x(user);
          uint256 multiplier =
            is3xQualified ? REFERRAL_MAX_CAP_MULTIPLIER : NON_REFERRAL_MAX_CAP_MULTIPLIER;
          uint256 maxEarnings = depositedPrincipal * multiplier;

          uint256 totalEarnedSoFar =
            _claimableRecurring[user] +
              _claimableDirect[user] +
              _claimableGeneration[user] +
              _claimableRank[user] +
              _claimableDao[user] +
              _totalClaimed[user] +
              _totalRestaked[user];

          if (totalEarnedSoFar >= maxEarnings) {
            return 0;
          } else if (totalEarnedSoFar + pending > maxEarnings) {
            return maxEarnings - totalEarnedSoFar;
          }
        }
      }

      return pending;
    }
    return 0;
  }

  /**
   * @notice Returns exact lifetime cap parameters and current progress for a staker
   */
  function getLifetimeCap(
    address user
  ) external view override returns (uint256 maxEarnings, uint256 totalEarned, bool isCapReached) {
    if (user == address(0) || vault == address(0)) return (0, 0, false);

    uint256 depositedPrincipal = IUVBEStakingVault(vault).getTotalDepositedPrincipal(user);
    if (depositedPrincipal == 0) return (0, 0, false);

    bool is3xQualified =
      registry != address(0) && IUVBEReferralRegistry(registry).hasUnlocked3x(user);
    uint256 multiplier =
      is3xQualified ? REFERRAL_MAX_CAP_MULTIPLIER : NON_REFERRAL_MAX_CAP_MULTIPLIER;
    maxEarnings = depositedPrincipal * multiplier;

    uint256 pendingRec = getPendingRecurringReward(user);
    totalEarned =
      _claimableRecurring[user] +
      pendingRec +
      _claimableDirect[user] +
      _claimableGeneration[user] +
      _claimableRank[user] +
      _claimableDao[user] +
      _totalClaimed[user] +
      _totalRestaked[user];

    isCapReached = totalEarned >= maxEarnings;
  }

  function getCurrentAnnualBps() public view override returns (uint256) {
    (, , , uint256 currentBps) = getRewardCapacity();
    return currentBps;
  }

  function getRewardCapacity()
    public
    view
    override
    returns (
      uint256 availableCapital,
      uint256 liabilities,
      uint256 surplusCapacity,
      uint256 currentBps
    )
  {
    availableCapital =
      vault != address(0) ? IUVBEStakingVault(vault).getAvailableProtocolCapital() : 0;

    uint256 totalStaked = vault != address(0) ? IUVBEStakingVault(vault).totalPermanentStaked() : 0;
    uint256 pendingLiab = 0;

    if (block.timestamp > lastUpdateTimestamp && totalStaked > 0 && currentAnnualBps > 0) {
      uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
      uint256 deltaIndex =
        (timeDelta * currentAnnualBps * INDEX_PRECISION) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
      pendingLiab = (totalStaked * deltaIndex) / INDEX_PRECISION;
      uint256 uncheckpointedSurplus =
        availableCapital > _totalOutstandingLiabilities
          ? availableCapital - _totalOutstandingLiabilities
          : 0;
      if (pendingLiab > uncheckpointedSurplus) {
        pendingLiab = uncheckpointedSurplus;
      }
    }

    liabilities = _totalOutstandingLiabilities + pendingLiab;
    surplusCapacity = availableCapital > liabilities ? availableCapital - liabilities : 0;
    currentBps =
      (totalStaked > 0 && surplusCapacity > 0)
        ? (surplusCapacity * BPS_DENOMINATOR) / totalStaked
        : 0;

    if (currentBps > MAX_RECURRING_ANNUAL_BPS) {
      currentBps = MAX_RECURRING_ANNUAL_BPS;
    }
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
    uint256 pendingRec = getPendingRecurringReward(user);
    recurringReward = _claimableRecurring[user] + pendingRec;
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

  function totalRewardPaid() external view override returns (uint256) {
    return _totalRewardPaid;
  }

  function currentDaoEpochId() external view override returns (uint256) {
    return _currentEpochId;
  }

  function getDaoEpoch(uint256 epochId) external view returns (IUVBEStakingMLM.DaoEpoch memory) {
    return _daoEpochs[epochId];
  }

  // --- Emergency Controls ---

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
