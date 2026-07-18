'use client';

import * as React from 'react';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useControllerAddress } from '../../hooks/useControllerAddress';
import { useAllowance } from '../../hooks/useAllowance';
import { useDepositPreview } from '../../hooks/useDepositPreview';
import { useDeposit } from '../../hooks/useDeposit';
import { SUPPORTED_ASSETS, Asset } from '../../lib/config/assets';
import { formatBigInt, formatUSD, parseAmount } from '../../lib/utils/formatters';
import { ACTIVE_CHAIN } from '../../lib/config/chains';
import {
  Coins,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
} from 'lucide-react';

export default function Deposit() {
  const { isConnected, connect: openConnectModal } = useWallet();
  const { isSupported, switchChain, chainId } = useNetwork();

  // Resolve chain assets (default to Sepolia config if not connected or unsupported)
  const currentChainId = chainId && SUPPORTED_ASSETS[chainId] ? chainId : ACTIVE_CHAIN.id;
  const assets = SUPPORTED_ASSETS[currentChainId];

  // Component states
  const [selectedAsset, setSelectedAsset] = React.useState<Asset>(assets[0]);
  const [amountInput, setAmountInput] = React.useState<string>('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync selected asset if chain switching updates the supported list
  React.useEffect(() => {
    setSelectedAsset(assets[0]);
    setAmountInput('');
  }, [currentChainId, assets]);

  // Handle dropdown click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssetSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Contract Addresses & Balances Hooks
  const { controllerAddress, isLoading: isLoadingController } = useControllerAddress();
  const { indexTokenAddress, isLoading: isLoadingTokenAddress } = useIndexTokenAddress();

  // Balances
  const {
    balance: assetBalance,
    decimals: assetDecimals,
    isLoading: isLoadingAssetBalance,
    refetch: refetchAssetBalance,
  } = useTokenBalance(selectedAsset.address);

  const {
    balance: shareBalance,
    isLoading: isLoadingShareBalance,
    refetch: refetchShareBalance,
  } = useTokenBalance(indexTokenAddress);

  // Allowance Flow
  const {
    allowance,
    approve,
    status: approveStatus,
    errorMessage: approveErrorMessage,
    refetch: refetchAllowance,
    reset: resetApprove,
  } = useAllowance(selectedAsset.address, controllerAddress);

  // Preview yield quote
  const {
    quote,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useDepositPreview(selectedAsset.address, amountInput, selectedAsset.decimals);

  // Deposit transaction lifecycle
  const {
    deposit,
    status: depositStatus,
    errorMessage: depositErrorMessage,
    reset: resetDeposit,
  } = useDeposit(selectedAsset.address);

  // Derived state inputs
  const parsedAmount = React.useMemo(() => {
    return parseAmount(amountInput, selectedAsset.decimals);
  }, [amountInput, selectedAsset]);

  const hasInsufficientBalance = React.useMemo(() => {
    if (assetBalance === undefined) return false;
    return parsedAmount > assetBalance;
  }, [parsedAmount, assetBalance]);

  const isAllowanceRequired = React.useMemo(() => {
    if (allowance === undefined || parsedAmount === 0n) return false;
    return allowance < parsedAmount;
  }, [allowance, parsedAmount]);

  // Slippage math: minSharesOut = previewShares * 99.5% (0.5% slippage tolerance)
  const minSharesOut = React.useMemo(() => {
    if (!quote) return 0n;
    return (quote.sharesPreview * 9950n) / 10000n;
  }, [quote]);

  // Overall page inputs locked status
  const isInputLocked =
    approveStatus === 'submitting' ||
    approveStatus === 'pending' ||
    depositStatus === 'submitting' ||
    depositStatus === 'pending';

  // Handle Max click
  const handleMaxClick = () => {
    if (assetBalance !== undefined && assetDecimals !== undefined) {
      setAmountInput(formatBigInt(assetBalance, assetDecimals, assetDecimals));
    }
  };

  // Perform Token Approval Transaction
  const handleApprove = async () => {
    if (parsedAmount === 0n) return;
    resetDeposit();
    await approve(parsedAmount);
    refetchAllowance();
  };

  // Perform Protocol Deposit Transaction
  const handleDeposit = async () => {
    if (parsedAmount === 0n || !controllerAddress || !quote) return;
    resetApprove();
    await deposit(parsedAmount, minSharesOut, quote.receiver);

    // Clear inputs and refresh balances upon successful confirmation
    if (depositStatus === 'idle' || depositStatus === 'confirmed') {
      // Note: We check if status changes to confirmed inside useEffect to trigger clears.
    }
  };

  // Trigger post-transaction successes & inputs clear
  React.useEffect(() => {
    if (depositStatus === 'confirmed') {
      setAmountInput('');
      refetchAssetBalance();
      refetchShareBalance();
      refetchAllowance();
      refetchPreview();
    }
  }, [depositStatus]);

  React.useEffect(() => {
    if (approveStatus === 'confirmed') {
      refetchAllowance();
      refetchPreview();
    }
  }, [approveStatus]);

  // Dynamic USD Value calculation
  const depositUsdValue = React.useMemo(() => {
    if (!quote || parsedAmount === 0n) return 0n;
    return (parsedAmount * quote.normalizedPrice) / 10n ** BigInt(selectedAsset.decimals);
  }, [quote, parsedAmount, selectedAsset]);

  const exchangeRate = React.useMemo(() => {
    if (!quote || quote.depositAmount === 0n) return 0;
    return (
      Number(quote.sharesPreview) /
      Number(quote.depositAmount / 10n ** BigInt(selectedAsset.decimals - 18))
    );
  }, [quote, selectedAsset]);

  return (
    <Container>
      <PageWrapper className="space-y-6 max-w-5xl mx-auto">
        {/* HEADER SECTION */}
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="w-8 h-8 text-primary" />
            <span>Deposit Collateral</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Deposit supported assets to mint yield-bearing UnifyVault Index shares.
          </p>
        </div>

        {!isConnected ? (
          <div className="min-h-[350px] rounded-xl border border-border bg-card/40 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
            <Wallet className="w-12 h-12 text-primary/40" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Wallet Connection Required</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Connect your Web3 wallet to read on-chain balances and deposit collateral.
              </p>
            </div>
            <button
              onClick={openConnectModal}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : !isSupported ? (
          <div className="min-h-[350px] rounded-xl border border-border bg-card/40 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
            <AlertTriangle className="w-12 h-12 text-destructive/80" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Unsupported Network</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Please switch your network to {ACTIVE_CHAIN.name} to interact with the vault.
              </p>
            </div>
            <button
              onClick={() => switchChain(ACTIVE_CHAIN.id)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
            >
              <span>Switch to {ACTIVE_CHAIN.name}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: INTERACTIVE FORM CARD */}
            <div className="md:col-span-7 bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-5">
              <h2 className="text-base font-semibold text-foreground">Interactive Deposit Form</h2>

              {/* Asset Input field container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Select Asset & Amount</span>
                  <span className="text-muted-foreground">
                    Balance:{' '}
                    {isLoadingAssetBalance ? (
                      <span className="inline-block w-8 h-3 rounded bg-secondary animate-pulse" />
                    ) : (
                      <span
                        className="text-foreground hover:text-primary cursor-pointer transition-colors"
                        onClick={handleMaxClick}
                        title="Click to use maximum balance"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleMaxClick()}
                      >
                        {assetBalance !== undefined && assetDecimals !== undefined
                          ? `${formatBigInt(assetBalance, assetDecimals, 4)} ${selectedAsset.symbol}`
                          : `0.00 ${selectedAsset.symbol}`}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-secondary/30 border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
                  {/* Custom dropdown asset selector */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => !isInputLocked && setIsAssetSelectorOpen(!isAssetSelectorOpen)}
                      disabled={isInputLocked}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background hover:bg-accent border border-border text-foreground text-xs font-semibold select-none disabled:opacity-50"
                      aria-label="Select asset selector dropdown"
                      aria-expanded={isAssetSelectorOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="text-primary font-bold uppercase">
                        {selectedAsset.symbol}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {isAssetSelectorOpen && (
                      <div
                        className="absolute left-0 mt-1.5 w-36 rounded-lg bg-popover border border-border shadow-xl z-50 overflow-hidden"
                        role="listbox"
                      >
                        {assets.map((asset) => (
                          <button
                            key={asset.symbol}
                            role="option"
                            aria-selected={selectedAsset.symbol === asset.symbol}
                            onClick={() => {
                              setSelectedAsset(asset);
                              setAmountInput('');
                              setIsAssetSelectorOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground font-medium transition-colors border-b border-border/50 last:border-0"
                          >
                            {asset.symbol} - {asset.name.replace(' (Mock)', '')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    disabled={isInputLocked}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setAmountInput(val.replace(',', '.'));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent border-none text-foreground text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 text-right pr-2 disabled:opacity-50"
                    aria-label="Deposit amount input"
                  />

                  <button
                    onClick={handleMaxClick}
                    disabled={isInputLocked || !assetBalance}
                    className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-2xs font-bold transition-all uppercase tracking-wider focus:outline-none disabled:opacity-40 shrink-0"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Insufficient balance indicator */}
              {hasInsufficientBalance && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Insufficient {selectedAsset.symbol} balance.</span>
                </div>
              )}

              {/* ACTION TRANSACTION STATE lifecycle alerts */}
              {approveStatus !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-1.5 animate-fadeIn ${
                    approveStatus === 'confirmed'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : approveErrorMessage
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-primary/5 border-primary/20 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {approveStatus === 'submitting' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {approveStatus === 'pending' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {approveStatus === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
                    {approveErrorMessage && <AlertTriangle className="w-4 h-4" />}

                    <span>
                      {approveStatus === 'submitting' && 'Waiting for Approval Signature...'}
                      {approveStatus === 'pending' && 'Confirming Approval on BaseScan...'}
                      {approveStatus === 'confirmed' && 'Approval Successful! Ready to deposit.'}
                      {approveErrorMessage && 'Approval Failed'}
                    </span>
                  </div>
                  {approveErrorMessage && (
                    <p className="text-2xs font-medium opacity-90 pl-6 leading-relaxed">
                      {approveErrorMessage}
                    </p>
                  )}
                </div>
              )}

              {depositStatus !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-1.5 animate-fadeIn ${
                    depositStatus === 'confirmed'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : depositErrorMessage
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-primary/5 border-primary/20 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {depositStatus === 'submitting' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {depositStatus === 'pending' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {depositStatus === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
                    {depositErrorMessage && <AlertTriangle className="w-4 h-4" />}

                    <span>
                      {depositStatus === 'submitting' && 'Waiting for Deposit Signature...'}
                      {depositStatus === 'pending' && 'Confirming Deposit transaction...'}
                      {depositStatus === 'confirmed' && 'Collateral Deployed Successfully!'}
                      {depositErrorMessage && 'Deposit Failed'}
                    </span>
                  </div>
                  {depositErrorMessage && (
                    <p className="text-2xs font-medium opacity-90 pl-6 leading-relaxed">
                      {depositErrorMessage}
                    </p>
                  )}
                  {depositStatus === 'confirmed' && (
                    <p className="text-2xs font-medium opacity-90 pl-6">
                      Your yield-bearing shares have been minted and your balance is updated.
                    </p>
                  )}
                </div>
              )}

              {/* ACTION TRANSACTION BUTTON */}
              {isAllowanceRequired ? (
                <button
                  onClick={handleApprove}
                  disabled={isInputLocked || hasInsufficientBalance || parsedAmount === 0n}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all focus:outline-none disabled:opacity-50"
                >
                  {approveStatus === 'submitting' && (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  )}
                  {approveStatus === 'pending' && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  <span>
                    {approveStatus === 'submitting' && 'Waiting for Wallet Approval...'}
                    {approveStatus === 'pending' && 'Confirming Approval on Chain...'}
                    {approveStatus === 'idle' && `Approve Spend limit for ${selectedAsset.symbol}`}
                    {approveStatus === 'confirmed' && 'Approved - Ready to Deposit'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleDeposit}
                  disabled={
                    isInputLocked ||
                    hasInsufficientBalance ||
                    parsedAmount === 0n ||
                    !quote ||
                    isLoadingPreview
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all focus:outline-none disabled:opacity-50"
                >
                  {depositStatus === 'submitting' && (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  )}
                  {depositStatus === 'pending' && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  <span>
                    {depositStatus === 'submitting' && 'Waiting for Deposit Signature...'}
                    {depositStatus === 'pending' && 'Deploying Collateral...'}
                    {depositStatus === 'idle' && `Deposit ${selectedAsset.symbol}`}
                    {depositStatus === 'confirmed' && 'Deposit Completed'}
                  </span>
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: YIELD PREVIEW & ASSET DETAILS */}
            <div className="md:col-span-5 space-y-6">
              {/* LIVE DEPOSIT PREVIEW CARD */}
              <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h2 className="text-base font-semibold text-foreground">Live Yield Preview</h2>

                {parsedAmount === 0n ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                    <Info className="w-8 h-8 text-muted-foreground/30" />
                    <p>Enter a collateral amount to preview your yield-bearing shares quote.</p>
                  </div>
                ) : isLoadingPreview || isLoadingController ? (
                  <div className="space-y-4 py-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="w-24 h-4 bg-secondary/50 animate-pulse rounded" />
                        <div className="w-16 h-4 bg-secondary/50 animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : quote ? (
                  <div className="space-y-3.5">
                    {/* Share preview details */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">
                        Estimated Shares Minted
                      </span>
                      <span className="text-foreground font-bold">
                        {formatBigInt(quote.sharesPreview, 18, 4)} UV-BTC-ETH
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">
                        Estimated Price Valuation
                      </span>
                      <span className="text-muted-foreground">
                        {formatUSD(depositUsdValue, true, 18)} USD
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Exchange Rate</span>
                      <span className="text-foreground font-semibold">
                        1 {selectedAsset.symbol} ≈ {exchangeRate.toFixed(4)} Shares
                      </span>
                    </div>

                    <div className="h-px bg-border/50 my-1" />

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Gross Deposit</span>
                      <span className="text-muted-foreground font-semibold">
                        {formatBigInt(quote.depositAmount, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Protocol Entry Fee</span>
                      <span className="text-destructive/80 font-medium">
                        -{formatBigInt(quote.protocolFee, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Net Assets Deployed</span>
                      <span className="text-primary font-bold">
                        {formatBigInt(quote.netDeposit, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>
                  </div>
                ) : isPreviewError ? (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                    <span className="font-semibold leading-relaxed">
                      Quote preview failed. Oracle price may be stale or asset limit exceeded.
                    </span>
                  </div>
                ) : null}
              </div>

              {/* PROTOCOL OVERVIEW AND HOLDINGS CARD */}
              <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h2 className="text-base font-semibold text-foreground">UnifyVault Holdings</h2>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">
                      Current Share Holdings
                    </span>
                    <span className="text-foreground font-bold">
                      {isLoadingShareBalance || isLoadingTokenAddress ? (
                        <span className="inline-block w-12 h-3 rounded bg-secondary animate-pulse" />
                      ) : shareBalance !== undefined ? (
                        `${formatBigInt(shareBalance, 18, 4)} UV-BTC-ETH`
                      ) : (
                        '0.0000 UV-BTC-ETH'
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Oracle Feed Rate</span>
                    <span className="text-foreground font-semibold">
                      {isLoadingPreview ? (
                        <span className="inline-block w-12 h-3 rounded bg-secondary animate-pulse" />
                      ) : quote ? (
                        `${formatUSD(quote.normalizedPrice, true, 18)} USD`
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-muted-foreground leading-relaxed text-2xs space-y-2">
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Info className="w-3.5 h-3.5" />
                      <span>DEPOSIT DISCLOSURE</span>
                    </div>
                    <p>
                      Deposits execute immediately on-chain using current decentralised oracle
                      feeds. Yields are generated dynamically via multi-asset strategies on Base. A
                      small entry fee (0.1%) is charged and routed to the treasury for protocol
                      maintenance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </Container>
  );
}
