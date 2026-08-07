'use client';

import { useDeposit } from './useDeposit';
import { useRedeem } from './useRedeem';
import { useBalances } from './useBalances';
import { useOraclePrices } from './useOraclePrices';

export function useVault() {
  const deposit = useDeposit();
  const redeem = useRedeem();
  const balances = useBalances();
  const oraclePrices = useOraclePrices();

  return {
    // Deposit state & actions
    depositAmountInput: deposit.depositAmountInput,
    setDepositAmountInput: deposit.setDepositAmountInput,
    depositSlippageBps: deposit.slippageBps,
    setDepositSlippageBps: deposit.setSlippageBps,
    formattedDepositQuote: deposit.formattedQuote,
    isApproved: deposit.isApproved,
    isApproving: deposit.isApproving,
    isDepositing: deposit.isDepositing,
    isDepositDisabled: deposit.isDepositDisabled,
    depositDisabledReason: deposit.depositDisabledReason,
    approve: deposit.approve,
    executeDeposit: deposit.executeDeposit,

    // Redeem state & actions
    sharesInput: redeem.sharesInput,
    setSharesInput: redeem.setSharesInput,
    redeemSlippageBps: redeem.slippageBps,
    setRedeemSlippageBps: redeem.setSlippageBps,
    grossRedeemUSD: redeem.grossUSD,
    feeRedeemUSD: redeem.feeUSD,
    netRedeemUSD: redeem.netUSD,
    isRedeeming: redeem.isRedeeming,
    isRedeemDisabled: redeem.isRedeemDisabled,
    executeRedeem: redeem.executeRedeem,

    // Account balances & allowances
    usdcBalance: balances.usdcBalance,
    sharesBalance: balances.sharesBalance,
    usdcAllowance: balances.usdcAllowance,
    refetchBalances: balances.refetch,

    // Live prices & oracle safety
    oraclePrices,
    isOracleFresh: oraclePrices.isAllFresh,
  };
}
