import { decodeErrorResult } from 'viem';
import { CONTROLLER_ABI } from '../contracts';

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
    rawMessage.includes('amount exceeds share balance')
  ) {
    return { message: 'Insufficient UVBTCETH balance', txHash };
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
  if (rawMessage.includes('enforcedpause') || rawMessage.includes('expectedpause')) {
    return { message: 'Protocol is currently paused by governance.', txHash };
  }
  if (rawMessage.includes('deadlineexpired')) {
    return { message: 'Transaction deadline expired. Please try again.', txHash };
  }
  if (rawMessage.includes('notacontract') || rawMessage.includes('zeroaddress')) {
    return { message: 'Invalid contract target or zero address detected.', txHash };
  }

  // 4. Try decoding custom error result from raw hex data
  const data = errorObj?.data || errorObj?.cause?.data || errorObj?.error?.data;
  if (data && typeof data === 'string' && data.startsWith('0x')) {
    try {
      const decoded = decodeErrorResult({ abi: CONTROLLER_ABI, data: data as `0x${string}` });
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
