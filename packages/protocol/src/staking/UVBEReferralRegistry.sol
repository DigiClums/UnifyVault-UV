// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '../interfaces/IUVBEStakingMLM.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVBEReferralRegistry
 * @notice Immutable referral tree, generation volume, and deterministic rank engine for UVBE MLM
 * @dev Enforces strict anti-cycle checks, anti-Sybil active requirements, and bounded generation traversal.
 */
contract UVBEReferralRegistry is IUVBEReferralRegistry, AccessControl, ReentrancyGuard {
  uint256 public constant MIN_ACTIVE_STAKE = 50 * 1e18; // 50 UVBE for active direct status
  uint8 public constant MAX_GENERATION_DEPTH = 10;
  uint8 public constant MAX_CYCLE_CHECK_DEPTH = 15;

  address public immutable genesisReferrer;
  address public override vault;
  address public override distributor;

  mapping(address => address) private _referrerOf;
  mapping(address => address[]) private _directsOf;
  mapping(address => uint256) private _teamVolumeOf;
  mapping(address => uint8) private _rankOf;
  mapping(address => bool) private _isRegistered;
  address[] private _daoLeaders;
  mapping(address => bool) private _isDaoLeader;

  error SelfReferralProhibited();
  error CircularReferralDetected(address cyclicAncestor);
  error UnauthorizedVault(address caller);
  error ModuleAlreadyInitialized();
  error ZeroAddress();

  event ReferralRegistered(address indexed user, address indexed referrer, uint256 timestamp);
  event TeamVolumeUpdated(address indexed upline, uint256 addedVolume, uint256 totalVolume);
  event RankAchieved(address indexed user, uint8 rankId, uint256 milestoneReward);

  modifier onlyVault() {
    if (msg.sender != vault) revert UnauthorizedVault(msg.sender);
    _;
  }

  constructor(address admin, address genesisRoot) {
    if (admin == address(0) || genesisRoot == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    genesisReferrer = genesisRoot;
    _isRegistered[genesisRoot] = true;
  }

  /**
   * @notice Configures authorized vault and distributor contracts exactly once, freezing them permanently
   */
  function setModules(
    address vaultAddress,
    address distributorAddress
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (vault != address(0) || distributor != address(0)) revert ModuleAlreadyInitialized();
    if (vaultAddress == address(0) || distributorAddress == address(0)) revert ZeroAddress();
    vault = vaultAddress;
    distributor = distributorAddress;
  }

  /**
   * @notice Records stake volume, binds referrer if new, updates ancestor team volumes, and evaluates ranks
   * @dev Called strictly by UVBEStakingVault
   */
  function recordStake(
    address user,
    uint256 amount,
    address referrer,
    bool /* isRestake */
  ) external override onlyVault nonReentrant {
    // 1. Initial Referral Binding (if not yet registered)
    if (!_isRegistered[user]) {
      _registerReferral(user, referrer);
    }

    // 2. Update Ancestor Team Volumes (traverse up to 10 generations)
    address current = _referrerOf[user];
    for (uint8 i = 1; i <= MAX_GENERATION_DEPTH && current != address(0); i++) {
      _teamVolumeOf[current] += amount;
      emit TeamVolumeUpdated(current, amount, _teamVolumeOf[current]);

      // Check and update rank for ancestor
      _evaluateRank(current);

      if (current == genesisReferrer) break;
      current = _referrerOf[current];
    }

    // 3. Evaluate staker's own rank (in case self-stake increased rank)
    _evaluateRank(user);
  }

  // --- Internal Methods ---

  function _registerReferral(address user, address proposedReferrer) internal {
    if (user == proposedReferrer) revert SelfReferralProhibited();

    address validReferrer = proposedReferrer;

    // Default to genesisReferrer if proposed referrer is invalid or unregistered
    if (validReferrer == address(0) || !_isRegistered[validReferrer]) {
      validReferrer = genesisReferrer;
    }

    // Anti-cycle check: ensure user is not already an ancestor of the proposed referrer
    if (validReferrer != genesisReferrer) {
      address ancestor = validReferrer;
      for (uint8 depth = 0; depth < MAX_CYCLE_CHECK_DEPTH && ancestor != address(0); depth++) {
        if (ancestor == user) {
          revert CircularReferralDetected(user);
        }
        if (ancestor == genesisReferrer) break;
        ancestor = _referrerOf[ancestor];
      }
    }

    _referrerOf[user] = validReferrer;
    _directsOf[validReferrer].push(user);
    _isRegistered[user] = true;

    emit ReferralRegistered(user, validReferrer, block.timestamp);
  }

  function _evaluateRank(address account) internal {
    if (account == address(0) || account == genesisReferrer || vault == address(0)) return;

    uint256 personalStake = IUVBEStakingVault(vault).getPermanentStake(account);
    uint256 activeDirects = getActiveDirectCount(account);
    uint256 teamVolume = _teamVolumeOf[account];
    uint8 currentRank = _rankOf[account];
    uint8 newRank = currentRank;

    // Deterministic Rank Progression (Bronze=1 to Crown Ambassador=6)
    if (personalStake >= 5_000 * 1e18 && activeDirects >= 10 && teamVolume >= 500_000 * 1e18) {
      newRank = 6; // Crown Ambassador
    } else if (
      personalStake >= 2_500 * 1e18 && activeDirects >= 7 && teamVolume >= 150_000 * 1e18
    ) {
      newRank = 5; // Diamond
    } else if (personalStake >= 1_000 * 1e18 && activeDirects >= 5 && teamVolume >= 50_000 * 1e18) {
      newRank = 4; // Platinum
    } else if (personalStake >= 500 * 1e18 && activeDirects >= 4 && teamVolume >= 20_000 * 1e18) {
      newRank = 3; // Gold
    } else if (personalStake >= 250 * 1e18 && activeDirects >= 3 && teamVolume >= 5_000 * 1e18) {
      newRank = 2; // Silver
    } else if (personalStake >= 100 * 1e18 && activeDirects >= 2 && teamVolume >= 1_000 * 1e18) {
      newRank = 1; // Bronze
    }

    if (newRank > currentRank) {
      _rankOf[account] = newRank;
      uint256 milestone = _getMilestoneReward(newRank);

      if (newRank >= 4 && !_isDaoLeader[account]) {
        _isDaoLeader[account] = true;
        _daoLeaders.push(account);
      }

      emit RankAchieved(account, newRank, milestone);
    }
  }

  function _getMilestoneReward(uint8 rankId) internal pure returns (uint256) {
    if (rankId == 1) return 25 * 1e18; // Bronze: 25 UVBE
    if (rankId == 2) return 100 * 1e18; // Silver: 100 UVBE
    if (rankId == 3) return 500 * 1e18; // Gold: 500 UVBE
    if (rankId == 4) return 1_500 * 1e18; // Platinum: 1,500 UVBE
    if (rankId == 5) return 5_000 * 1e18; // Diamond: 5,000 UVBE
    if (rankId == 6) return 20_000 * 1e18; // Crown Ambassador: 20,000 UVBE
    return 0;
  }

  // --- View Methods ---

  function getReferrer(address user) external view override returns (address) {
    return _referrerOf[user];
  }

  function getDirects(address user) external view override returns (address[] memory) {
    return _directsOf[user];
  }

  function getActiveDirectCount(address user) public view override returns (uint256 activeCount) {
    if (vault == address(0)) return 0;
    address[] memory directs = _directsOf[user];
    uint256 len = directs.length;
    for (uint256 i = 0; i < len; i++) {
      if (IUVBEStakingVault(vault).getPermanentStake(directs[i]) >= MIN_ACTIVE_STAKE) {
        activeCount++;
      }
    }
  }

  function getTeamVolume(address user) external view override returns (uint256) {
    return _teamVolumeOf[user];
  }

  function getRank(address user) external view override returns (uint8) {
    return _rankOf[user];
  }

  function getDaoLeaders() external view override returns (address[] memory) {
    return _daoLeaders;
  }

  function getDaoLeaderShares()
    external
    view
    override
    returns (address[] memory leaders, uint256[] memory shares, uint256 totalShares)
  {
    leaders = _daoLeaders;
    uint256 len = leaders.length;
    shares = new uint256[](len);
    for (uint256 i = 0; i < len; ) {
      uint8 rank = _rankOf[leaders[i]];
      uint256 s = 0;
      if (rank == 4) s = 1;
      else if (rank == 5) s = 3;
      else if (rank == 6) s = 10;
      shares[i] = s;
      totalShares += s;
      unchecked {
        ++i;
      }
    }
  }

  function getUplineChain(
    address user,
    uint8 maxDepth
  ) external view override returns (address[] memory upline) {
    uint8 depth =
      (maxDepth > MAX_GENERATION_DEPTH || maxDepth == 0) ? MAX_GENERATION_DEPTH : maxDepth;
    address[] memory temp = new address[](depth);
    uint8 count = 0;

    address current = _referrerOf[user];
    while (current != address(0) && count < depth) {
      temp[count] = current;
      count++;
      if (current == genesisReferrer) break;
      current = _referrerOf[current];
    }

    upline = new address[](count);
    for (uint8 i = 0; i < count; i++) {
      upline[i] = temp[i];
    }
  }

  function isUserActive(address user) external view override returns (bool) {
    if (vault == address(0)) return false;
    return IUVBEStakingVault(vault).getPermanentStake(user) >= MIN_ACTIVE_STAKE;
  }
}
