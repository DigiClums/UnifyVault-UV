'use client';

import React, { useState, useEffect } from 'react';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TradeSide } from '../../types/options';
import {
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi';
import { UV_OPTION_POSITION_MANAGER_ABI, ERC20_OPTIONS_ABI } from '../../lib/contracts/optionsABIs';
import { parseUnits, encodePacked, keccak256 } from 'viem';
import { baseSepolia } from 'viem/chains';

export function TradePanel() {
  const {
    chainId,
    isBaseSepolia,
    isMainnet,
    contracts,
    selectedOption,
    isConnected,
    uvbeBalance,
    uvbePriceUsd,
    economicConfig,
    refetchPositions,
    refetchBalance,
  } = useOptionsProtocol();

  const { switchChain } = useSwitchChain();
  const [side, setSide] = useState<TradeSide>('BUY');
  const [quantityLots, setQuantityLots] = useState<number>(1);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();
  const [tradeTxHash, setTradeTxHash] = useState<`0x${string}` | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wagmi Contract Write Hooks
  const { writeContractAsync: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: writeOpenPosition, isPending: isOpenPending } = useWriteContract();

  // Watch Approval Receipt
  const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalTxHash,
    });

  // Watch Trade Receipt
  const { isLoading: isTradeLoading, isSuccess: isTradeSuccess } = useWaitForTransactionReceipt({
    hash: tradeTxHash,
  });

  // Series ID computation (matches UVOptionMarketFactory: keccak256(underlyingIndexId, strike, expiry, lotSize, optionType, maxPriceDeviationCapBps))
  const seriesId = React.useMemo(() => {
    if (!selectedOption) return undefined;
    const strikeWei = parseUnits(selectedOption.strike.toString(), 18);
    const lotSizeWei = parseUnits(selectedOption.lotSize.toString(), 18);
    const optionTypeInt = selectedOption.type === 'CE' ? 0 : 1;
    const indexId = keccak256(encodePacked(['string'], ['UV-NIFTY']));
    return keccak256(
      encodePacked(
        ['bytes32', 'uint256', 'uint256', 'uint256', 'uint8', 'uint256'],
        [
          indexId,
          strikeWei,
          BigInt(selectedOption.expiryTimestamp),
          lotSizeWei,
          optionTypeInt,
          5000n,
        ],
      ),
    );
  }, [selectedOption]);

  // Read ERC20 Allowance for UVOptionPositionManager
  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.uvbeToken,
    abi: ERC20_OPTIONS_ABI,
    functionName: 'allowance',
    args:
      isConnected && contracts.optionPositionManager
        ? [contracts.uvbeToken, contracts.optionPositionManager]
        : undefined,
    query: {
      enabled: Boolean(
        isConnected && contracts.uvbeToken && contracts.optionPositionManager && isBaseSepolia,
      ),
    },
  });

  // Total Cost & Collateral Calculations
  const isCall = selectedOption?.type === 'CE';
  const lotSize = selectedOption?.lotSize || 0.01;
  const totalCostUvbe = (selectedOption?.premiumUvbe || 0) * quantityLots * lotSize;
  const totalCostUsd = (selectedOption?.premiumUsd || 0) * quantityLots * lotSize;
  const totalCostWei = parseUnits(Math.max(0.0001, totalCostUvbe).toFixed(18), 18);

  const writerRequiredCollateralUsd =
    (selectedOption?.strike || 0) *
    lotSize *
    quantityLots *
    0.15 *
    (economicConfig.minimumCollateralRatioPct / 100);
  const writerRequiredCollateralUvbe =
    writerRequiredCollateralUsd / (uvbePriceUsd * (1 - economicConfig.collateralHaircutPct / 100));
  const writerCollateralWei = parseUnits(
    Math.max(0.0001, writerRequiredCollateralUvbe).toFixed(18),
    18,
  );

  const requiredPaymentWei = side === 'BUY' ? totalCostWei : writerCollateralWei;
  const isAllowanceSufficient = rawAllowance ? rawAllowance >= requiredPaymentWei : false;

  // Handle Token Approval
  const handleApprove = async () => {
    try {
      setErrorMessage(null);
      if (!contracts.optionPositionManager) {
        throw new Error('Option Position Manager address not configured on this network.');
      }
      const hash = await writeApprove({
        address: contracts.uvbeToken,
        abi: ERC20_OPTIONS_ABI,
        functionName: 'approve',
        args: [contracts.optionPositionManager, parseUnits('1000000000', 18)],
      });
      setApprovalTxHash(hash);
    } catch (err: any) {
      setErrorMessage(err?.shortMessage || err?.message || 'Token approval rejected or failed.');
    }
  };

  // Handle Position Open Execution
  const handleOpenPosition = async () => {
    try {
      setErrorMessage(null);
      if (!contracts.optionPositionManager || !seriesId) {
        throw new Error('Position Manager or Series ID not initialized.');
      }
      const isLong = side === 'BUY';
      const hash = await writeOpenPosition({
        address: contracts.optionPositionManager,
        abi: UV_OPTION_POSITION_MANAGER_ABI,
        functionName: 'openPosition',
        args: [seriesId, isLong, BigInt(quantityLots)],
      });
      setTradeTxHash(hash);
    } catch (err: any) {
      setErrorMessage(err?.shortMessage || err?.message || 'Trade execution reverted or rejected.');
    }
  };

  // Post-Execution Refresh
  useEffect(() => {
    if (isTradeSuccess) {
      refetchPositions();
      refetchBalance();
      refetchAllowance();
    }
  }, [isTradeSuccess, refetchPositions, refetchBalance, refetchAllowance]);

  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
    }
  }, [isApprovalSuccess, refetchAllowance]);

  if (!selectedOption) {
    return (
      <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl p-6 text-center text-muted-foreground font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
        Select a Strike from the Option Chain to configure a trade.
      </div>
    );
  }

  return (
    <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col font-mono">
      {/* Tab Selectors: BUY vs WRITE */}
      <div className="flex border-b-2 border-black dark:border-white/10 bg-surface">
        <button
          onClick={() => setSide('BUY')}
          className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-colors min-h-[44px] ${
            side === 'BUY'
              ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-inner'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          BUY {selectedOption.type}
        </button>
        <button
          onClick={() => setSide('WRITE')}
          className={`flex-1 py-3 text-xs font-black tracking-wider uppercase transition-colors min-h-[44px] ${
            side === 'WRITE'
              ? 'bg-amber-600 text-white shadow-inner'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          WRITE / SELL
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Selected Option Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle">
          <div>
            <div className="font-black text-sm flex items-center gap-1.5 text-foreground">
              UV-NIFTY {selectedOption.strike.toLocaleString()} {selectedOption.type}
              {isCall ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Expiry: {selectedOption.expiryLabel} ({selectedOption.cycle})
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">
              Moneyness
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                selectedOption.moneyness === 'ITM'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  : selectedOption.moneyness === 'ATM'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {selectedOption.moneyness}
            </span>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Quantity (Lots of {lotSize} Index Units):</span>
            <span className="text-foreground font-black">
              {(quantityLots * lotSize).toFixed(2)} Units
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantityLots((q) => Math.max(1, q - 1))}
              className="px-4 py-2 bg-surface hover:bg-muted border border-border-subtle rounded-lg text-foreground font-black text-sm min-h-[44px] min-w-[44px]"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={quantityLots}
              onChange={(e) => setQuantityLots(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-center text-foreground font-black focus:outline-none focus:border-[#BFFF00] min-h-[44px]"
            />
            <button
              onClick={() => setQuantityLots((q) => q + 1)}
              className="px-4 py-2 bg-surface hover:bg-muted border border-border-subtle rounded-lg text-foreground font-black text-sm min-h-[44px] min-w-[44px]"
            >
              +
            </button>
          </div>
        </div>

        {/* Financial & Settlement Breakdown */}
        <div className="space-y-2 pt-2 border-t border-border-subtle text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Premium:</span>
            <span className="text-foreground font-bold">
              {selectedOption.premiumUvbe.toFixed(2)} UVBE{' '}
              <span className="text-muted-foreground font-normal">
                (${selectedOption.premiumUsd.toFixed(2)})
              </span>
            </span>
          </div>

          {side === 'BUY' ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Premium Required:</span>
                <span className="text-[#5f8f00] dark:text-[#BFFF00] font-black">
                  {totalCostUvbe.toFixed(3)} UVBE{' '}
                  <span className="text-muted-foreground font-normal">
                    (${totalCostUsd.toFixed(2)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum Risk:</span>
                <span className="text-rose-500 font-bold">
                  {totalCostUvbe.toFixed(3)} UVBE (Limited to Premium)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Settlement Asset:</span>
                <span className="text-amber-500 font-bold">100% UVBE Token</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Premium Received:</span>
                <span className="text-[#5f8f00] dark:text-[#BFFF00] font-black">
                  +{totalCostUvbe.toFixed(3)} UVBE
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Margin Collateral:</span>
                <span className="text-amber-500 font-bold">
                  {writerRequiredCollateralUvbe.toFixed(2)} UVBE
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocol MCR Requirement:</span>
                <span className="text-[#5f8f00] dark:text-[#BFFF00] font-bold">
                  {economicConfig.minimumCollateralRatioPct}% MCR ({economicConfig.source})
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between pt-1 border-t border-dashed border-border-subtle">
            <span className="text-muted-foreground">Your UVBE Balance:</span>
            <span className="text-foreground font-black">{uvbeBalance.toFixed(2)} UVBE</span>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transaction Receipt Status Notice */}
        {tradeTxHash && (
          <div className="p-3 rounded-xl bg-surface border border-border-subtle space-y-1 text-[11px]">
            <div className="flex items-center justify-between font-bold">
              <span>Transaction Status:</span>
              <span
                className={
                  isTradeSuccess
                    ? 'text-emerald-500'
                    : isTradeLoading
                      ? 'text-amber-500'
                      : 'text-foreground'
                }
              >
                {isTradeLoading
                  ? 'Mining on Base Sepolia...'
                  : isTradeSuccess
                    ? 'Confirmed on-chain! ✓'
                    : 'Submitted'}
              </span>
            </div>
            <a
              href={`https://sepolia.basescan.org/tx/${tradeTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5f8f00] dark:text-[#BFFF00] hover:underline flex items-center gap-1 text-[10px] font-mono break-all"
            >
              <span>
                {tradeTxHash.slice(0, 16)}...{tradeTxHash.slice(-10)}
              </span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        )}

        {/* Action Button & Safety Guard */}
        <div className="pt-2">
          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton showBalance={false} />
            </div>
          ) : isMainnet ? (
            <button
              disabled
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border-2 border-rose-500/40 cursor-not-allowed min-h-[44px]"
            >
              MAINNET TRADING STRICTLY DISABLED
            </button>
          ) : !isBaseSepolia ? (
            <button
              onClick={() => switchChain({ chainId: baseSepolia.id })}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black border-2 border-black min-h-[44px]"
            >
              Switch to Base Sepolia (84532)
            </button>
          ) : !isAllowanceSufficient ? (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isApprovalLoading}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#BFFF00] hover:bg-[#a6e000] text-black border-2 border-black active:translate-x-0.5 active:translate-y-0.5 min-h-[44px] flex items-center justify-center gap-2"
            >
              {(isApprovePending || isApprovalLoading) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isApprovePending
                ? 'Confirm Approval in Wallet...'
                : isApprovalLoading
                  ? 'Approving UVBE Token...'
                  : 'Approve UVBE For Trading'}
            </button>
          ) : (
            <button
              onClick={handleOpenPosition}
              disabled={isOpenPending || isTradeLoading}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] bg-[#BFFF00] hover:bg-[#a6e000] text-black border-2 border-black active:translate-x-0.5 active:translate-y-0.5 min-h-[44px] flex items-center justify-center gap-2"
            >
              {(isOpenPending || isTradeLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {isOpenPending
                ? 'Confirm in Wallet...'
                : isTradeLoading
                  ? 'Broadcasting Transaction...'
                  : `${side} ${selectedOption.strike} ${selectedOption.type} (${
                      side === 'BUY'
                        ? totalCostUvbe.toFixed(2)
                        : writerRequiredCollateralUvbe.toFixed(1)
                    } UVBE)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
