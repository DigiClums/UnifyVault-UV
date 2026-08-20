import { decodeErrorResult } from 'viem';
import {
  CONTROLLER_ABI,
  UNIFY_VAULT_PAYMASTER_ABI,
  GAS_TREASURY_ABI,
  COST_BASIS_MANAGER_V2_ABI,
  PERFORMANCE_MANAGER_ABI,
  ORACLE_MANAGER_ABI,
  CHAINLINK_ORACLE_PROVIDER_ABI,
  STRATEGY_MANAGER_ABI,
  LIQUIDITY_MANAGER_ABI,
} from '../contracts';

export const ERC_6093_ERRORS_ABI = [
  {
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'balance', type: 'uint256' },
      { name: 'needed', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
    type: 'error',
  },
  {
    inputs: [{ name: 'sender', type: 'address' }],
    name: 'ERC20InvalidSender',
    type: 'error',
  },
  {
    inputs: [{ name: 'receiver', type: 'address' }],
    name: 'ERC20InvalidReceiver',
    type: 'error',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'allowance', type: 'uint256' },
      { name: 'needed', type: 'uint256' },
    ],
    name: 'ERC20InsufficientAllowance',
    type: 'error',
  },
  {
    inputs: [{ name: 'approver', type: 'address' }],
    name: 'ERC20InvalidApprover',
    type: 'error',
  },
  {
    inputs: [{ name: 'spender', type: 'address' }],
    name: 'ERC20InvalidSpender',
    type: 'error',
  },
] as const;

export interface DecodedError {
  message: string;
  txHash?: `0x${string}`;
}

export function decodeTransactionError(
  err: unknown,
  defaultMessage: string = 'Transaction reverted on-chain. Please try again after refreshing the quote.',
): DecodedError {
  if (!err) {
    return { message: defaultMessage };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorObj = err as any;

  // Extract transaction hash if embedded in viem error object
  const txHash = errorObj?.txHash || errorObj?.hash || errorObj?.cause?.txHash || undefined;

  const rawMessage = (
    errorObj?.shortMessage ||
    errorObj?.message ||
    errorObj?.details ||
    String(err)
  ).toLowerCase();

  // 1. User rejection
  if (
    errorObj?.code === 4001 ||
    errorObj?.cause?.code === 4001 ||
    rawMessage.includes('user rejected') ||
    rawMessage.includes('user denied') ||
    rawMessage.includes('rejected by user')
  ) {
    return { message: 'Transaction rejected by wallet', txHash };
  }

  // 2. Insufficient Balances & Allowances
  if (
    rawMessage.includes('insufficient usdc balance') ||
    rawMessage.includes('amount exceeds usdc balance')
  ) {
    return { message: 'Insufficient USDC balance', txHash };
  }
  if (
    rawMessage.includes('insufficient uvbtceth balance') ||
    rawMessage.includes('insufficient uvbe balance') ||
    rawMessage.includes('amount exceeds share balance')
  ) {
    return { message: 'Insufficient UVBE balance', txHash };
  }
  if (
    rawMessage.includes('insufficienttreasurybalance') ||
    rawMessage.includes('insufficient treasury balance')
  ) {
    return { message: 'Insufficient ETH balance in Gas Treasury reserve.', txHash };
  }
  if (
    rawMessage.includes('exceeds balance') ||
    rawMessage.includes('transfer amount exceeds balance')
  ) {
    return { message: 'Insufficient balance', txHash };
  }
  if (rawMessage.includes('exceeds allowance') || rawMessage.includes('insufficient allowance')) {
    return { message: 'Insufficient allowance', txHash };
  }

  // 3. Custom Solidity Errors & Revert Reasons
  if (
    rawMessage.includes('slippageexceeded') ||
    rawMessage.includes('insufficientswapoutput') ||
    rawMessage.includes('slippage')
  ) {
    return { message: 'Slippage tolerance exceeded. Try increasing slippage tolerance.', txHash };
  }
  if (
    rawMessage.includes('depositexceedstxlimit') ||
    rawMessage.includes('dailydepositcapexceeded')
  ) {
    return { message: 'Deposit amount exceeds protocol daily/tx limits.', txHash };
  }
  if (
    rawMessage.includes('redeemexceedstxlimit') ||
    rawMessage.includes('dailyredeemcapexceeded')
  ) {
    return { message: 'Redeem amount exceeds protocol daily/tx limits.', txHash };
  }
  if (rawMessage.includes('paymasterpaused') || rawMessage.includes('paymaster is paused')) {
    return { message: 'Paymaster gas sponsorship is currently paused.', txHash };
  }
  if (rawMessage.includes('treasurypaused') || rawMessage.includes('gas treasury is paused')) {
    return { message: 'Gas Treasury is currently paused.', txHash };
  }
  if (rawMessage.includes('enforcedpause') || rawMessage.includes('expectedpause')) {
    return { message: 'Protocol is currently paused by governance.', txHash };
  }
  if (rawMessage.includes('registryisfrozen')) {
    return {
      message: 'Protocol Directory is permanently frozen. No modifications allowed.',
      txHash,
    };
  }
  if (rawMessage.includes('entryalreadyexists')) {
    return { message: 'Module entry already exists in registry.', txHash };
  }
  if (rawMessage.includes('entrydoesnotexist')) {
    return { message: 'Module entry does not exist in Protocol Directory.', txHash };
  }
  if (rawMessage.includes('identicaladdresssubmitted')) {
    return { message: 'New address is identical to existing registered address.', txHash };
  }
  if (rawMessage.includes('accesscontrolunauthorizedaccount')) {
    return { message: 'Caller account lacks the required AccessControl role.', txHash };
  }
  if (rawMessage.includes('ownableunauthorizedaccount')) {
    return { message: 'Caller is not the contract owner.', txHash };
  }
  if (rawMessage.includes('onlyoperatororowner')) {
    return {
      message: 'Caller is neither the contract owner nor authorized refill operator.',
      txHash,
    };
  }
  if (rawMessage.includes('onlyentrypoint')) {
    return { message: 'Caller is not the canonical ERC-4337 EntryPoint contract.', txHash };
  }
  if (rawMessage.includes('maxcostexceeded')) {
    return { message: 'UserOperation gas cost exceeds maximum cost per op limit.', txHash };
  }
  if (rawMessage.includes('gasfeecapexceeded')) {
    return { message: 'Gas fee per gas exceeds paymaster maximum fee cap.', txHash };
  }
  if (rawMessage.includes('sendercooldownactive')) {
    return {
      message: 'Sender cooldown is active. Please wait before submitting another operation.',
      txHash,
    };
  }
  if (rawMessage.includes('invalidtarget')) {
    return { message: 'Target contract is not whitelisted for Paymaster gas sponsorship.', txHash };
  }
  if (rawMessage.includes('invalidselector')) {
    return {
      message: 'Function selector is not whitelisted for Paymaster gas sponsorship.',
      txHash,
    };
  }
  if (rawMessage.includes('nativevalueforbidden')) {
    return { message: 'Native ETH value transfer is forbidden for sponsored operations.', txHash };
  }
  if (rawMessage.includes('invalidbatchlengths')) {
    return { message: 'Invalid batch operation array lengths.', txHash };
  }
  if (rawMessage.includes('exactapprovalviolation')) {
    return {
      message: 'Approved amount must exactly match deposit amount in sponsored batch.',
      txHash,
    };
  }
  if (rawMessage.includes('invalidsigner')) {
    return { message: 'Invalid paymaster verification signer signature.', txHash };
  }
  if (rawMessage.includes('invalidsignaturelength')) {
    return { message: 'Invalid signature length in paymaster data.', txHash };
  }
  if (rawMessage.includes('signatureexpired')) {
    return { message: 'Paymaster verification signature has expired.', txHash };
  }
  if (rawMessage.includes('signaturenotyetvalid')) {
    return { message: 'Paymaster verification signature is not yet valid.', txHash };
  }
  if (rawMessage.includes('verifyingsignerrequired')) {
    return { message: 'A verifying signer must be set before requiring signatures.', txHash };
  }
  if (rawMessage.includes('invalidpaymaster')) {
    return { message: 'Paymaster address configured on Gas Treasury is invalid.', txHash };
  }
  if (rawMessage.includes('exceedsmaxrefillpertx')) {
    return { message: 'Refill amount exceeds maximum refill per transaction limit.', txHash };
  }
  if (rawMessage.includes('exceedsdailyrefilllimit')) {
    return { message: 'Refill amount exceeds remaining 24-hour daily limit.', txHash };
  }
  if (rawMessage.includes('timelockinsufficientdelay')) {
    return { message: 'Timelock execution delay is less than minimum 48 hours.', txHash };
  }
  if (rawMessage.includes('timelockunauthorizedcaller')) {
    return {
      message: 'Caller lacks required Timelock role (Proposer / Executor / Canceller).',
      txHash,
    };
  }
  if (rawMessage.includes('timelockunexpectedoperationstate')) {
    return { message: 'Timelock operation is not in the required state for this action.', txHash };
  }
  if (rawMessage.includes('deadlineexpired')) {
    return { message: 'Transaction deadline expired. Please try again.', txHash };
  }
  if (rawMessage.includes('unsafepricing')) {
    return {
      message: 'Oracle price validation failed: Unsafe or out-of-bounds price detected.',
      txHash,
    };
  }
  if (rawMessage.includes('assetnotsupported')) {
    return { message: 'Asset is not supported by the oracle/strategy module.', txHash };
  }
  if (rawMessage.includes('invalidtotalallocation')) {
    return {
      message: 'Strategy weights must sum to exactly 10,000 basis points (100.00%).',
      txHash,
    };
  }
  if (rawMessage.includes('zeroweightnotallowed')) {
    return { message: 'Strategy weight cannot be zero. Remove asset instead.', txHash };
  }
  if (rawMessage.includes('emptystrategynotallowed')) {
    return { message: 'Strategy portfolio cannot be empty.', txHash };
  }
  if (rawMessage.includes('invalidthresholdconfiguration')) {
    return {
      message:
        'Invalid liquidity thresholds. Must satisfy: refill <= target <= excess <= 10000 BPS.',
      txHash,
    };
  }
  if (rawMessage.includes('insufficientreservebalance')) {
    return { message: 'Insufficient reserve liquidity balance for refill operation.', txHash };
  }
  if (rawMessage.includes('insufficientoperationalbalance')) {
    return { message: 'Insufficient operational liquidity balance for sweep operation.', txHash };
  }
  if (rawMessage.includes('notacontract') || rawMessage.includes('zeroaddress')) {
    return { message: 'Invalid contract target or zero address detected.', txHash };
  }

  // 4. Try decoding custom error result from raw hex data
  const data = errorObj?.data || errorObj?.cause?.data || errorObj?.error?.data;
  if (data && typeof data === 'string' && data.startsWith('0x')) {
    const rawData = data as `0x${string}`;

    // Controller errors
    try {
      const decoded = decodeErrorResult({ abi: CONTROLLER_ABI, data: rawData });
      if (
        decoded.errorName === 'SlippageExceeded' ||
        decoded.errorName === 'InsufficientSwapOutput'
      ) {
        return {
          message: 'Slippage tolerance exceeded. Try increasing slippage tolerance.',
          txHash,
        };
      }
      if (
        decoded.errorName === 'DepositExceedsTxLimit' ||
        decoded.errorName === 'DailyDepositCapExceeded'
      ) {
        return { message: 'Deposit amount exceeds protocol limits.', txHash };
      }
      if (
        decoded.errorName === 'RedeemExceedsTxLimit' ||
        decoded.errorName === 'DailyRedeemCapExceeded'
      ) {
        return { message: 'Redeem amount exceeds protocol limits.', txHash };
      }
      if (decoded.errorName === 'EnforcedPause' || decoded.errorName === 'ExpectedPause') {
        return { message: 'Protocol is currently paused by governance.', txHash };
      }
      if (decoded.errorName === 'InsufficientBalance') {
        return { message: 'Insufficient balance for transaction.', txHash };
      }
      if (decoded.errorName === 'InsufficientAllowance') {
        return { message: 'Insufficient allowance for transaction.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Paymaster errors
    try {
      const decoded = decodeErrorResult({ abi: UNIFY_VAULT_PAYMASTER_ABI, data: rawData });
      if (decoded.errorName === 'PaymasterPaused') {
        return { message: 'Paymaster gas sponsorship is currently paused.', txHash };
      }
      if (decoded.errorName === 'MaxCostExceeded') {
        return { message: 'UserOperation gas cost exceeds max cost per op limit.', txHash };
      }
      if (decoded.errorName === 'GasFeeCapExceeded') {
        return { message: 'Gas fee per gas exceeds paymaster maximum fee cap.', txHash };
      }
      if (decoded.errorName === 'SenderCooldownActive') {
        return {
          message: 'Sender cooldown is active. Please wait before submitting another operation.',
          txHash,
        };
      }
      if (decoded.errorName === 'InvalidTarget') {
        return {
          message: 'Target contract is not whitelisted for Paymaster gas sponsorship.',
          txHash,
        };
      }
      if (decoded.errorName === 'InvalidSelector') {
        return {
          message: 'Function selector is not whitelisted for Paymaster gas sponsorship.',
          txHash,
        };
      }
      if (decoded.errorName === 'NativeValueForbidden') {
        return {
          message: 'Native ETH value transfer is forbidden for sponsored operations.',
          txHash,
        };
      }
      if (decoded.errorName === 'ExactApprovalViolation') {
        return {
          message: 'Approved amount must exactly match deposit amount in sponsored batch.',
          txHash,
        };
      }
      if (decoded.errorName === 'InvalidSigner') {
        return { message: 'Invalid paymaster verification signer signature.', txHash };
      }
      if (decoded.errorName === 'VerifyingSignerRequired') {
        return { message: 'A verifying signer must be set before requiring signatures.', txHash };
      }
      if (decoded.errorName === 'OnlyEntryPoint') {
        return { message: 'Caller is not the canonical ERC-4337 EntryPoint contract.', txHash };
      }
      if (decoded.errorName === 'OwnableUnauthorizedAccount') {
        return { message: 'Caller is not the Paymaster owner.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Gas Treasury errors
    try {
      const decoded = decodeErrorResult({ abi: GAS_TREASURY_ABI, data: rawData });
      if (decoded.errorName === 'TreasuryPaused') {
        return { message: 'Gas Treasury is currently paused.', txHash };
      }
      if (decoded.errorName === 'OnlyOperatorOrOwner') {
        return {
          message: 'Caller is neither the Gas Treasury owner nor designated refill operator.',
          txHash,
        };
      }
      if (decoded.errorName === 'ExceedsMaxRefillPerTx') {
        return { message: 'Refill amount exceeds maximum refill per transaction limit.', txHash };
      }
      if (decoded.errorName === 'ExceedsDailyRefillLimit') {
        return { message: 'Refill amount exceeds remaining 24-hour daily refill limit.', txHash };
      }
      if (decoded.errorName === 'InsufficientTreasuryBalance') {
        return { message: 'Insufficient native ETH balance in Gas Treasury reserve.', txHash };
      }
      if (decoded.errorName === 'InvalidPaymaster') {
        return { message: 'Paymaster address configured on Gas Treasury is invalid.', txHash };
      }
      if (decoded.errorName === 'OwnableUnauthorizedAccount') {
        return { message: 'Caller is not the Gas Treasury owner.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Cost Basis Manager errors
    try {
      const decoded = decodeErrorResult({ abi: COST_BASIS_MANAGER_V2_ABI, data: rawData });
      if (decoded.errorName === 'ZeroAddressDetected') {
        return { message: 'Zero address detected in accounting operation.', txHash };
      }
      if (decoded.errorName === 'ZeroAmountDetected') {
        return { message: 'Zero amount specified. Value must be greater than zero.', txHash };
      }
      if (decoded.errorName === 'InsufficientShares') {
        return { message: 'Insufficient user share balance for accounting operation.', txHash };
      }
      if (decoded.errorName === 'ReentrancyDetected') {
        return { message: 'Reentrancy guard triggered on accounting contract.', txHash };
      }
      if (decoded.errorName === 'UnauthorizedCaller') {
        return { message: 'Caller is not authorized to invoke this accounting hook.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Performance Manager errors
    try {
      const decoded = decodeErrorResult({ abi: PERFORMANCE_MANAGER_ABI, data: rawData });
      if (decoded.errorName === 'ZeroAddressDetected') {
        return { message: 'Zero address detected in performance query.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Oracle Manager errors
    try {
      const decoded = decodeErrorResult({ abi: ORACLE_MANAGER_ABI, data: rawData });
      if (decoded.errorName === 'AssetNotSupported') {
        return { message: 'Asset is not supported by OracleManager.', txHash };
      }
      if (decoded.errorName === 'UnsafePricing') {
        return {
          message:
            'Oracle price safety check failed: Price deviation exceeds threshold or feed is stale.',
          txHash,
        };
      }
      if (decoded.errorName === 'HeartbeatIntervalOutofBounds') {
        return { message: 'Oracle heartbeat interval is out of valid bounds.', txHash };
      }
      if (decoded.errorName === 'ZeroAddressDetected') {
        return { message: 'Zero address detected in oracle operation.', txHash };
      }
      if (decoded.errorName === 'MathCalculationOverflow') {
        return { message: 'Math calculation overflow in oracle operation.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Chainlink Oracle Provider errors
    try {
      const decoded = decodeErrorResult({ abi: CHAINLINK_ORACLE_PROVIDER_ABI, data: rawData });
      if (decoded.errorName === 'IncompleteRound') {
        return { message: 'Chainlink oracle returned an incomplete round.', txHash };
      }
      if (decoded.errorName === 'EntryAlreadyExists') {
        return { message: 'Chainlink feed entry already exists for this asset.', txHash };
      }
      if (decoded.errorName === 'OracleProviderPriceNegative') {
        return { message: 'Chainlink feed returned a negative or zero price.', txHash };
      }
      if (decoded.errorName === 'OracleProviderPriceStale') {
        return { message: 'Chainlink feed price is stale beyond allowed heartbeat.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Strategy Manager errors
    try {
      const decoded = decodeErrorResult({ abi: STRATEGY_MANAGER_ABI, data: rawData });
      if (decoded.errorName === 'ZeroAddressDetected') {
        return { message: 'Zero address detected in strategy operation.', txHash };
      }
      if (decoded.errorName === 'ZeroWeightNotAllowed') {
        return { message: 'Strategy weight cannot be zero. Remove asset instead.', txHash };
      }
      if (decoded.errorName === 'AssetAlreadySupported') {
        return { message: 'Asset is already supported in the strategy portfolio.', txHash };
      }
      if (decoded.errorName === 'AssetNotSupportedByStrategy') {
        return { message: 'Asset is not supported by the strategy.', txHash };
      }
      if (decoded.errorName === 'EmptyStrategyNotAllowed') {
        return { message: 'Strategy portfolio cannot be empty.', txHash };
      }
      if (decoded.errorName === 'InvalidTotalAllocation') {
        return {
          message: 'Strategy weights must sum to exactly 10,000 basis points (100.00%).',
          txHash,
        };
      }
      if (decoded.errorName === 'ArrayLengthMismatch') {
        return { message: 'Assets and weights array length mismatch.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Liquidity Manager errors
    try {
      const decoded = decodeErrorResult({ abi: LIQUIDITY_MANAGER_ABI, data: rawData });
      if (decoded.errorName === 'ZeroAddressDetected') {
        return { message: 'Zero address detected in liquidity operation.', txHash };
      }
      if (decoded.errorName === 'ZeroAmountDetected') {
        return { message: 'Liquidity amount must be greater than zero.', txHash };
      }
      if (decoded.errorName === 'InvalidThresholdConfiguration') {
        return {
          message:
            'Invalid threshold configuration. Must satisfy: refill <= target <= excess <= 10000 BPS.',
          txHash,
        };
      }
      if (decoded.errorName === 'InsufficientReserveBalance') {
        return { message: 'Insufficient reserve liquidity balance for refill.', txHash };
      }
      if (decoded.errorName === 'InsufficientOperationalBalance') {
        return { message: 'Insufficient operational liquidity balance for sweep.', txHash };
      }
    } catch {
      // Continue to next ABI
    }

    // Generic ERC-6093 Standard Token Errors
    try {
      const decoded = decodeErrorResult({ abi: ERC_6093_ERRORS_ABI, data: rawData });
      if (decoded.errorName === 'ERC20InsufficientBalance') {
        return { message: 'Insufficient ERC20 token balance for this transfer.', txHash };
      }
      if (decoded.errorName === 'ERC20InsufficientAllowance') {
        return {
          message: 'Insufficient token allowance. Please approve token spending first.',
          txHash,
        };
      }
      if (decoded.errorName === 'ERC20InvalidSender') {
        return { message: 'Invalid token sender address.', txHash };
      }
      if (decoded.errorName === 'ERC20InvalidReceiver') {
        return { message: 'Invalid token recipient address.', txHash };
      }
      if (
        decoded.errorName === 'ERC20InvalidApprover' ||
        decoded.errorName === 'ERC20InvalidSpender'
      ) {
        return { message: 'Invalid token approval parameters.', txHash };
      }
    } catch {
      // Ignore decoding failure
    }
  }

  // 5. Never display raw "execution reverted (code=3)"
  if (rawMessage.includes('execution reverted') || rawMessage.includes('code=3')) {
    return { message: defaultMessage, txHash };
  }

  // Return clean short message if readable, otherwise default
  const cleanMsg = errorObj?.shortMessage || errorObj?.message;
  if (
    cleanMsg &&
    typeof cleanMsg === 'string' &&
    cleanMsg.length < 120 &&
    !cleanMsg.includes('code=3')
  ) {
    return { message: cleanMsg, txHash };
  }

  return { message: defaultMessage, txHash };
}
