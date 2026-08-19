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
 * @notice Permanent UVBE staking vault and protocol-owned reward capital custodian
 * @dev Staked UVBE principal (95%) is permanently locked protocol-owned capital backing the reward engine.
 * Users have ZERO principal withdrawal rights (no unstake, withdraw, or unlock).
 * Authorized reward payouts are disbursed directly from this protocol-owned capital upon verified distributor calls.
 */
contract UVBEStakingVault is IUVBEStakingVault, AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  uint256 public constant MIN_STAKE = 50 * 1e18; // 50 UVBE minimum stake
  uint256 public constant MAX_STAKE = 100_000 * 1e18; // 100,000 UVBE max per transaction
  uint256 public constant ADMIN_FEE_BPS = 500; // 5.00% admin treasury fee
  uint256 public constant BPS_DENOMINATOR = 10_000;

  address public immutable override token;
  address public immutable override treasury;
  address public override registry;
  address public override distributor;

  uint256 private _totalPermanentStaked;
  mapping(address => uint256) private _permanentStakeOf;
  mapping(address => IUVBEStakingMLM.StakeRecord[]) private _stakeRecords;

  error BelowMinStake(uint256 provided, uint256 minimum);
  error ExceedsMaxStake(uint256 provided, uint256 maximum);
  error UnauthorizedDistributor(address caller);
  error InsufficientProtocolCapital(uint256 requested, uint256 available);
  error ModuleAlreadyInitialized();
  error ZeroAddress();
  error ZeroAmount();

  event RegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
  event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
  event TreasuryFeeCollected(address indexed user, address indexed treasury, uint256 feeAmount);
  event StakeCreated(
    address indexed user,
    uint256 indexed stakeId,
    uint256 grossAmount,
    uint256 protocolCapital,
    uint256 treasuryFee,
    address indexed referrer
  );
  event PermanentStakeIncreased(
    address indexed user,
    uint256 indexed stakeId,
    uint256 amount,
    bool isRestake
  );
  event RewardDisbursed(address indexed recipient, uint256 amount, uint256 remainingCapital);

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
    treasury = admin;
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
   * @notice Stakes already-minted UVBE tokens permanently into the vault as protocol-owned capital
   * @param amount Gross user stake amount before the 5% admin treasury fee
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
   * @dev Called strictly by UVBERewardDistributor. Restaked tokens are already in this vault,
   * so no token transfer is required. Restakes are exempt from the 5% treasury fee.
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

  /**
   * @notice Disburses verified reward payouts directly to a user from protocol-owned staking capital
   * @dev Called strictly by UVBERewardDistributor upon claim
   * @param recipient Target user address
   * @param amount Reward amount to disburse
   */
  function disburseReward(
    address recipient,
    uint256 amount
  ) external override onlyDistributor nonReentrant whenNotPaused {
    if (recipient == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();

    uint256 available = IERC20(token).balanceOf(address(this));
    if (amount > available) revert InsufficientProtocolCapital(amount, available);

    IERC20(token).safeTransfer(recipient, amount);
    uint256 remaining = available - amount;

    emit RewardDisbursed(recipient, amount, remaining);
  }

  // --- Internal Stake Logic ---

  function _executeStake(address user, uint256 amount, address referrer) internal {
    if (amount < MIN_STAKE) revert BelowMinStake(amount, MIN_STAKE);
    if (amount > MAX_STAKE) revert ExceedsMaxStake(amount, MAX_STAKE);

    // 1. Pull the gross stake amount from the user into the vault.
    IERC20(token).safeTransferFrom(user, address(this), amount);

    // 2. Send exactly 5% of the gross stake to the admin treasury.
    uint256 feeAmount = (amount * ADMIN_FEE_BPS) / BPS_DENOMINATOR;
    uint256 principalAmount = amount - feeAmount;
    if (feeAmount > 0) {
      IERC20(token).safeTransfer(treasury, feeAmount);
      emit TreasuryFeeCollected(user, treasury, feeAmount);
    }

    // 3. The net 95% remains in this vault as permanent protocol-owned staking capital.
    _totalPermanentStaked += principalAmount;
    _permanentStakeOf[user] += principalAmount;

    uint256 stakeId = _stakeRecords[user].length;
    _stakeRecords[user].push(
      IUVBEStakingMLM.StakeRecord({ amount: principalAmount, stakedAt: block.timestamp })
    );

    // 4. Notify Registry (Referral bindings, Team Volume, Rank evaluations)
    if (registry != address(0)) {
      IUVBEReferralRegistry(registry).recordStake(user, principalAmount, referrer, false);
    }

    // 5. Trigger Reward Distributor to allocate commissions and update dynamic rate.
    if (distributor != address(0)) {
      IUVBERewardDistributor(distributor).distributeCommissions(user, principalAmount, false);
    }

    if (stakeId == 0) {
      emit StakeCreated(user, stakeId, amount, principalAmount, feeAmount, referrer);
    } else {
      emit PermanentStakeIncreased(user, stakeId, principalAmount, false);
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

  /**
   * @notice Returns total liquid protocol-owned UVBE held in this vault backing the reward system
   */
  function getAvailableProtocolCapital() public view override returns (uint256) {
    return IERC20(token).balanceOf(address(this));
  }

  /**
   * @notice Alias for getAvailableProtocolCapital
   */
  function totalProtocolCapital() external view override returns (uint256) {
    return getAvailableProtocolCapital();
  }

  // --- Emergency Controls ---

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
