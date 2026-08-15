// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';
import './interfaces/IPaymasterV07.sol';

/**
 * @title UnifyVaultPaymaster
 * @notice Self-managed ERC-4337 v0.7 Verifying & Policy Paymaster for UnifyVault.
 *
 * Provides verifiable, non-custodial gas sponsorship for approved protocol interactions:
 * - Batched USDC approve + UnifyVaultController deposit (exact allowance check)
 * - UnifyVaultController redeem
 * - UVBE token transfers
 * - P2PEscrow trade funding, release, dispute resolution
 *
 * Strict Security Invariants:
 * 1. Zero ETH transfer value (strict prevention of native ETH draining)
 * 2. Strict target contract whitelist (USDC, Controller, UVBE, P2PEscrow)
 * 3. Strict function selector whitelist on approved targets
 * 4. Maximum gas cost per operation cap & max fee per gas cap
 * 5. Optional ECDSA sponsorship signature verification from UnifyVault signer
 * 6. Gas Treasury isolation: Paymaster gas balance is held strictly in EntryPoint v0.7.
 *    It has ZERO connection to CustodyVault collateral, user cost basis, or NAV accounting.
 */
contract UnifyVaultPaymaster is IPaymasterV07, Ownable {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  // Canonical EntryPoint v0.7
  IEntryPointV07 public immutable entryPoint;

  // SimpleAccount execution selectors
  bytes4 public constant EXECUTE_SELECTOR = 0xb61d27f6; // execute(address,uint256,bytes)
  bytes4 public constant EXECUTE_BATCH_SELECTOR = 0x47e1da2a; // executeBatch(address[],uint256[],bytes[])

  // Validation constants
  uint256 internal constant VALIDATION_SUCCESS = 0;
  uint256 internal constant SIG_VALIDATION_FAILED = 1;

  // Sponsoring parameters
  address public verifyingSigner;
  uint256 public maxCostPerUserOp; // in wei
  uint256 public maxFeePerGasCap; // in wei (0 = uncapped)
  uint256 public userOpCooldown; // in seconds (0 = disabled)
  bool public requireSigner; // if true, valid signature is mandatory
  bool public isPaused;

  // Policy whitelists
  mapping(address => bool) public approvedTargets;
  mapping(address => mapping(bytes4 => bool)) public approvedSelectors;
  mapping(address => uint256) public lastSponsoredTimestamp;

  // Events
  event TargetApprovalUpdated(address indexed target, bool approved);
  event SelectorApprovalUpdated(address indexed target, bytes4 indexed selector, bool approved);
  event SignerUpdated(address indexed oldSigner, address indexed newSigner);
  event PolicyConfigUpdated(
    uint256 maxCost,
    uint256 maxFeeCap,
    uint256 cooldown,
    bool requireSigner
  );
  event UserOperationSponsored(
    address indexed sender,
    bytes32 indexed userOpHash,
    uint256 actualGasCost,
    bool success
  );
  event GasWithdrawn(address indexed to, uint256 amount);
  event EmergencyPaused(bool paused);

  // Custom Errors
  error OnlyEntryPoint();
  error PaymasterPaused();
  error MaxCostExceeded(uint256 requested, uint256 limit);
  error GasFeeCapExceeded(uint256 requested, uint256 cap);
  error SenderCooldownActive(address sender, uint256 retryAfter);
  error InvalidTarget(address target);
  error InvalidSelector(address target, bytes4 selector);
  error NativeValueForbidden(uint256 value);
  error InvalidBatchLengths();
  error ExactApprovalViolation(uint256 approved, uint256 deposited);
  error InvalidSigner(address recovered, address expected);
  error InvalidSignatureLength(uint256 length);
  error SignatureExpired(uint48 validUntil, uint48 currentTimestamp);
  error SignatureNotYetValid(uint48 validAfter, uint48 currentTimestamp);
  error VerifyingSignerRequired();

  modifier onlyEntryPoint() {
    if (msg.sender != address(entryPoint)) revert OnlyEntryPoint();
    _;
  }

  modifier whenNotPaused() {
    if (isPaused) revert PaymasterPaused();
    _;
  }

  constructor(
    address _entryPoint,
    address _owner,
    address _verifyingSigner,
    uint256 _maxCostPerUserOp
  ) Ownable(_owner) {
    require(_entryPoint != address(0), 'Invalid EntryPoint');
    entryPoint = IEntryPointV07(_entryPoint);
    verifyingSigner = _verifyingSigner;
    maxCostPerUserOp = _maxCostPerUserOp > 0 ? _maxCostPerUserOp : 0.05 ether;
    maxFeePerGasCap = 100 gwei;
    requireSigner = _verifyingSigner != address(0);
  }

  /**
   * @notice Validates a UserOperation for Paymaster gas sponsorship.
   * Called by the EntryPoint v0.7 during the validation phase.
   */
  function validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  )
    external
    override
    onlyEntryPoint
    whenNotPaused
    returns (bytes memory context, uint256 validationData)
  {
    // 1. Gas cost limits check
    if (maxCost > maxCostPerUserOp) {
      revert MaxCostExceeded(maxCost, maxCostPerUserOp);
    }

    // 2. Gas price cap check (if configured)
    if (maxFeePerGasCap > 0) {
      uint256 maxFeePerGas = uint128(bytes16(userOp.gasFees));
      if (maxFeePerGas > maxFeePerGasCap) {
        revert GasFeeCapExceeded(maxFeePerGas, maxFeePerGasCap);
      }
    }

    // 3. Sender cooldown check (anti-spam)
    if (userOpCooldown > 0) {
      uint256 lastTime = lastSponsoredTimestamp[userOp.sender];
      if (block.timestamp < lastTime + userOpCooldown) {
        revert SenderCooldownActive(userOp.sender, lastTime + userOpCooldown);
      }
    }

    // 4. Strict Calldata Policy Inspection
    _validateCallDataPolicy(userOp.callData);

    // 5. Signature verification (if enabled or present in paymasterAndData)
    // In ERC-4337 v0.7, paymasterAndData format:
    // [0..20]: paymaster address
    // [20..36]: paymasterVerificationGasLimit (16 bytes)
    // [36..52]: paymasterPostOpGasLimit (16 bytes)
    // [52..]: paymasterData (optional: validUntil 6 bytes + validAfter 6 bytes + signature 65 bytes)
    uint48 validUntil = 0;
    uint48 validAfter = 0;
    bool sigFailed = false;

    if (userOp.paymasterAndData.length >= 52 + 77) {
      bytes calldata paymasterData = userOp.paymasterAndData[52:];
      validUntil = uint48(bytes6(paymasterData[0:6]));
      validAfter = uint48(bytes6(paymasterData[6:12]));
      bytes calldata signature = paymasterData[12:77];

      if (block.timestamp > validUntil && validUntil != 0) {
        revert SignatureExpired(validUntil, uint48(block.timestamp));
      }
      if (block.timestamp < validAfter) {
        revert SignatureNotYetValid(validAfter, uint48(block.timestamp));
      }

      if (verifyingSigner != address(0)) {
        bytes32 hashToSign = getHash(userOp, validUntil, validAfter);
        bytes32 ethSignedHash = hashToSign.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        if (recovered != verifyingSigner) {
          if (requireSigner) {
            revert InvalidSigner(recovered, verifyingSigner);
          } else {
            sigFailed = true;
          }
        }
      }
    } else if (requireSigner) {
      revert InvalidSignatureLength(userOp.paymasterAndData.length);
    }

    validationData = _packValidationData(sigFailed, validUntil, validAfter);
    context = abi.encode(userOp.sender, userOpHash);
  }

  /**
   * @notice Called by EntryPoint v0.7 after the UserOperation execution.
   */
  function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256 /* actualUserOpFeePerGas */
  ) external override onlyEntryPoint {
    (address sender, bytes32 userOpHash) = abi.decode(context, (address, bytes32));
    lastSponsoredTimestamp[sender] = block.timestamp;

    bool success = (mode == PostOpMode.opSucceeded);
    emit UserOperationSponsored(sender, userOpHash, actualGasCost, success);
  }

  /**
   * @notice Validates that the UserOperation callData targets only approved protocol contracts
   * and selectors, and transfers NO native ETH.
   */
  function _validateCallDataPolicy(bytes calldata callData) internal view {
    if (callData.length < 4) revert InvalidSelector(address(0), bytes4(0));

    bytes4 execSelector = bytes4(callData[:4]);

    if (execSelector == EXECUTE_SELECTOR) {
      (address dest, uint256 value, bytes memory func) = abi.decode(
        callData[4:],
        (address, uint256, bytes)
      );
      if (value != 0) revert NativeValueForbidden(value);
      if (!approvedTargets[dest]) revert InvalidTarget(dest);

      bytes4 funcSelector = bytes4(func);
      if (!approvedSelectors[dest][funcSelector]) revert InvalidSelector(dest, funcSelector);
    } else if (execSelector == EXECUTE_BATCH_SELECTOR) {
      (address[] memory dests, uint256[] memory values, bytes[] memory funcs) = abi.decode(
        callData[4:],
        (address[], uint256[], bytes[])
      );

      if (dests.length == 0 || dests.length != values.length || values.length != funcs.length) {
        revert InvalidBatchLengths();
      }

      for (uint256 i = 0; i < dests.length; i++) {
        if (values[i] != 0) revert NativeValueForbidden(values[i]);
        if (!approvedTargets[dests[i]]) revert InvalidTarget(dests[i]);

        bytes4 funcSelector = bytes4(funcs[i]);
        if (!approvedSelectors[dests[i]][funcSelector])
          revert InvalidSelector(dests[i], funcSelector);
      }

      // Check exact allowance matching if batch is Approve + Deposit
      if (dests.length == 2) {
        bytes4 sel0 = bytes4(funcs[0]);
        bytes4 sel1 = bytes4(funcs[1]);
        // 0x095ea7b3 = approve(address,uint256)
        // 0x8b6099db = deposit(address,uint256,uint256,address)
        if (
          sel0 == 0x095ea7b3 &&
          sel1 == 0x8b6099db &&
          funcs[0].length >= 68 &&
          funcs[1].length >= 132
        ) {
          (, uint256 approvedAmount) = abi.decode(_slice(funcs[0], 4), (address, uint256));
          (, uint256 depositAmount, , ) = abi.decode(
            _slice(funcs[1], 4),
            (address, uint256, uint256, address)
          );
          if (approvedAmount != depositAmount) {
            revert ExactApprovalViolation(approvedAmount, depositAmount);
          }
        }
      }
    } else {
      revert InvalidSelector(address(0), execSelector);
    }
  }

  /**
   * @notice Constructs the hash that the sponsoring signer must sign.
   */
  function getHash(
    PackedUserOperation calldata userOp,
    uint48 validUntil,
    uint48 validAfter
  ) public view returns (bytes32) {
    return
      keccak256(
        abi.encode(
          userOp.sender,
          userOp.nonce,
          keccak256(userOp.initCode),
          keccak256(userOp.callData),
          userOp.accountGasLimits,
          userOp.preVerificationGas,
          userOp.gasFees,
          block.chainid,
          address(this),
          validUntil,
          validAfter
        )
      );
  }

  /**
   * @notice Helper to pack ERC-4337 validation data.
   */
  function _packValidationData(
    bool sigFailed,
    uint48 validUntil,
    uint48 validAfter
  ) internal pure returns (uint256) {
    return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << (160 + 48));
  }

  /**
   * @notice Slice helper for bytes memory
   */
  function _slice(bytes memory data, uint256 start) internal pure returns (bytes memory) {
    require(data.length >= start, 'Slice out of bounds');
    bytes memory result = new bytes(data.length - start);
    for (uint256 i = start; i < data.length; i++) {
      result[i - start] = data[i];
    }
    return result;
  }

  // ==========================================
  // CONFIGURATION & POLICY ADMIN (onlyOwner)
  // ==========================================

  function setApprovedTarget(address target, bool approved) external onlyOwner {
    require(target != address(0), 'Invalid target address');
    approvedTargets[target] = approved;
    emit TargetApprovalUpdated(target, approved);
  }

  function setApprovedSelector(address target, bytes4 selector, bool approved) external onlyOwner {
    require(target != address(0), 'Invalid target address');
    approvedSelectors[target][selector] = approved;
    emit SelectorApprovalUpdated(target, selector, approved);
  }

  function setVerifyingSigner(address newSigner) external onlyOwner {
    address oldSigner = verifyingSigner;
    verifyingSigner = newSigner;
    emit SignerUpdated(oldSigner, newSigner);
  }

  function setPolicyConfig(
    uint256 _maxCostPerUserOp,
    uint256 _maxFeePerGasCap,
    uint256 _userOpCooldown,
    bool _requireSigner
  ) external onlyOwner {
    if (_requireSigner && verifyingSigner == address(0)) {
      revert VerifyingSignerRequired();
    }
    maxCostPerUserOp = _maxCostPerUserOp;
    maxFeePerGasCap = _maxFeePerGasCap;
    userOpCooldown = _userOpCooldown;
    requireSigner = _requireSigner;
    emit PolicyConfigUpdated(_maxCostPerUserOp, _maxFeePerGasCap, _userOpCooldown, _requireSigner);
  }

  function setPaused(bool paused) external onlyOwner {
    isPaused = paused;
    emit EmergencyPaused(paused);
  }

  // ==========================================
  // GAS DEPOSIT & ENTRYPOINT MANAGEMENT
  // ==========================================

  /**
   * @notice Deposit gas funds directly to EntryPoint v0.7 for this Paymaster.
   */
  function deposit() external payable {
    entryPoint.depositTo{ value: msg.value }(address(this));
  }

  /**
   * @notice Withdraw excess gas deposit from EntryPoint to designated treasury address.
   */
  function withdrawTo(address payable destination, uint256 amount) external onlyOwner {
    require(destination != address(0), 'Invalid destination');
    entryPoint.withdrawTo(destination, amount);
    emit GasWithdrawn(destination, amount);
  }

  /**
   * @notice Returns current gas deposit balance on EntryPoint.
   */
  function getDeposit() external view returns (uint256) {
    return entryPoint.balanceOf(address(this));
  }

  /**
   * @notice Stake management on EntryPoint v0.7
   */
  function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
    entryPoint.addStake{ value: msg.value }(unstakeDelaySec);
  }

  function unlockStake() external onlyOwner {
    entryPoint.unlockStake();
  }

  function withdrawStake(address payable destination) external onlyOwner {
    require(destination != address(0), 'Invalid destination');
    entryPoint.withdrawStake(destination);
  }

  receive() external payable {
    if (msg.value > 0) {
      entryPoint.depositTo{ value: msg.value }(address(this));
    }
  }
}
