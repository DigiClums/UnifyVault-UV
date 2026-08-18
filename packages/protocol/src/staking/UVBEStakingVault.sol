// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../interfaces/IUVBEStakingMLM.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVBEStakingVault
 * @notice Permanent UVBE staking vault where principal is permanently locked forever
 * @dev Staked UVBE principal mathematically can never leave this contract.
 * There is NO unstake, unlock, withdraw, or recovery function.
 */
contract UVBEStakingVault is IUVBEStakingVault, AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  uint256 public constant MIN_STAKE = 50 * 1e18; // 50 UVBE minimum stake
  uint256 public constant MAX_STAKE = 100_000 * 1e18; // 100,000 UVBE max per transaction

  address public immutable override token;
  address public override registry;
  address public override distributor;

  uint256 private _totalPermanentStaked;
  mapping(address => uint256) private _permanentStakeOf;
  mapping(address => IUVBEStakingMLM.StakeRecord[]) private _stakeRecords;

  error BelowMinStake(uint256 provided, uint256 minimum);
  error ExceedsMaxStake(uint256 provided, uint256 maximum);
  error UnauthorizedDistributor(address caller);
  error ModuleAlreadyInitialized();
  error ZeroAddress();
  error ZeroAmount();

  event RegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
  event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
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

  modifier onlyDistributor() {
    if (msg.sender != distributor) revert UnauthorizedDistributor(msg.sender);
    _;
  }

  constructor(address admin, address tokenAddress) {
    if (admin == address(0) || tokenAddress == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(AccessRoles.GUARDIAN_ROLE, admin);

    token = tokenAddress;
  }

  /**
   * @notice Sets the referral registry and reward distributor module addresses exactly once, freezing them permanently
   */
  function setModules(
    address newRegistry,
    address newDistributor
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (registry != address(0) || distributor != address(0)) revert ModuleAlreadyInitialized();
    if (newRegistry == address(0) || newDistributor == address(0)) revert ZeroAddress();

    registry = newRegistry;
    distributor = newDistributor;

    emit RegistryUpdated(address(0), newRegistry);
    emit DistributorUpdated(address(0), newDistributor);
  }

  /**
   * @notice Stakes already-minted UVBE tokens permanently into the vault
   * @param amount Token amount to stake
   * @param referrer Referrer address for new stakers
   */
  function stake(uint256 amount, address referrer) external override nonReentrant whenNotPaused {
    _executeStake(msg.sender, amount, referrer);
  }

  /**
   * @notice Gasless 1-click staking using EIP-2612 permit signature
   */
  function stakeWithPermit(
    uint256 amount,
    address referrer,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override nonReentrant whenNotPaused {
    IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
    _executeStake(msg.sender, amount, referrer);
  }

  /**
   * @notice Records permanent stake generated via reward restaking
   * @dev Called strictly by UVBERewardDistributor after transferring tokens from UVBERewardReserve
   */
  function recordRestake(
    address user,
    uint256 amount
  ) external override onlyDistributor nonReentrant whenNotPaused {
    if (user == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();

    _totalPermanentStaked += amount;
    _permanentStakeOf[user] += amount;

    uint256 stakeId = _stakeRecords[user].length;
    _stakeRecords[user].push(
      IUVBEStakingMLM.StakeRecord({ amount: amount, stakedAt: block.timestamp })
    );

    // Notify registry of personal volume growth without generating new commissions
    if (registry != address(0)) {
      IUVBEReferralRegistry(registry).recordStake(user, amount, address(0), true);
    }

    emit PermanentStakeIncreased(user, stakeId, amount, true);
  }

  // --- Internal Stake Logic ---

  function _executeStake(address user, uint256 amount, address referrer) internal {
    if (amount < MIN_STAKE) revert BelowMinStake(amount, MIN_STAKE);
    if (amount > MAX_STAKE) revert ExceedsMaxStake(amount, MAX_STAKE);

    // 1. Pull already-minted UVBE from user wallet
    IERC20(token).safeTransferFrom(user, address(this), amount);

    // 2. State accounting
    _totalPermanentStaked += amount;
    _permanentStakeOf[user] += amount;

    uint256 stakeId = _stakeRecords[user].length;
    _stakeRecords[user].push(
      IUVBEStakingMLM.StakeRecord({ amount: amount, stakedAt: block.timestamp })
    );

    // 3. Notify Registry (Referral bindings, Team Volume, Rank evaluations)
    if (registry != address(0)) {
      IUVBEReferralRegistry(registry).recordStake(user, amount, referrer, false);
    }

    // 4. Trigger Reward Distributor (Direct Referral, Gen 2-10 matching, DAO Leadership pool)
    if (distributor != address(0)) {
      IUVBERewardDistributor(distributor).distributeCommissions(user, amount, false);
    }

    if (stakeId == 0) {
      emit StakeCreated(user, stakeId, amount, referrer);
    } else {
      emit PermanentStakeIncreased(user, stakeId, amount, false);
    }
  }

  // --- View Methods ---

  function getPermanentStake(address user) external view override returns (uint256) {
    return _permanentStakeOf[user];
  }

  function getStakeRecord(
    address user,
    uint256 index
  ) external view override returns (uint256 amount, uint256 stakedAt) {
    IUVBEStakingMLM.StakeRecord memory rec = _stakeRecords[user][index];
    return (rec.amount, rec.stakedAt);
  }

  function getStakeCount(address user) external view override returns (uint256) {
    return _stakeRecords[user].length;
  }

  function totalPermanentStaked() external view override returns (uint256) {
    return _totalPermanentStaked;
  }

  // --- Emergency Controls ---

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
