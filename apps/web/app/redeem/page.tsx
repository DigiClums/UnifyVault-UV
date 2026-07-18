'use client';

import * as React from 'react';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useControllerAddress } from '../../hooks/useControllerAddress';
import { useRedeemPreview } from '../../hooks/useRedeemPreview';
import { useRedeem } from '../../hooks/useRedeem';
import { SUPPORTED_ASSETS, Asset } from '../../lib/config/assets';
import { formatBigInt, parseAmount } from '../../lib/utils/formatters';
import { ACTIVE_CHAIN } from '../../lib/config/chains';
import {
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export default function Redeem() {
  const { isConnected, connect: openConnectModal } = useWallet();
  const { isSupported, switchChain, chainId } = useNetwork();

  // Resolve chain assets (default to Sepolia config if not connected or unsupported)
  const currentChainId = chainId && SUPPORTED_ASSETS[chainId] ? chainId : ACTIVE_CHAIN.id;
  const assets = SUPPORTED_ASSETS[currentChainId];

  // Component states
  const [selectedAsset, setSelectedAsset] = React.useState<Asset>(assets[0]);
  const [sharesInput, setSharesInput] = React.useState<string>('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync selected asset if chain updates
  React.useEffect(() => {
    setSelectedAsset(assets[0]);
    setSharesInput('');
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

  // Contract Address and Balance Hooks
  const { isLoading: isLoadingController } = useControllerAddress();
  const { indexTokenAddress, isLoading: isLoadingTokenAddress } = useIndexTokenAddress();

  // User share balance (Index token)
  const {
    balance: shareBalance,
    isLoading: isLoadingShareBalance,
    refetch: refetchShareBalance,
  } = useTokenBalance(indexTokenAddress);

  // User underlying collateral balance (to refresh after redemption)
  const {
    balance: assetBalance,
    isLoading: isLoadingAssetBalance,
    refetch: refetchAssetBalance,
  } = useTokenBalance(selectedAsset.address);

  // Redeem Preview hook (debounced)
  const {
    netAssetsOut,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useRedeemPreview(selectedAsset.address, sharesInput);

  // Redeem Write Hook
  const {
    redeem,
    status: redeemStatus,
    errorMessage: redeemErrorMessage,
  } = useRedeem(selectedAsset.address);

  // Derived state inputs
  const parsedShares = React.useMemo(() => {
    return parseAmount(sharesInput, 18); // Shares have 18 decimals
  }, [sharesInput]);

  const hasInsufficientBalance = React.useMemo(() => {
    if (shareBalance === undefined) return false;
    return parsedShares > shareBalance;
  }, [parsedShares, shareBalance]);

  // Slippage calculations: minAssetsOut = previewAssets * 99.5% (0.5% slippage tolerance)
  const minAssetsOut = React.useMemo(() => {
    if (!netAssetsOut) return 0n;
    return (netAssetsOut * 9950n) / 10000n;
  }, [netAssetsOut]);

  // UI state lockers
  const isInputLocked = redeemStatus === 'submitting' || redeemStatus === 'pending';

  // Handle Max click
  const handleMaxClick = () => {
    if (shareBalance !== undefined) {
      setSharesInput(formatBigInt(shareBalance, 18, 18));
    }
  };

  // Perform Redeem Action
  const handleRedeem = async () => {
    if (parsedShares === 0n || !quoteValues) return;
    await redeem(parsedShares, minAssetsOut);
  };

  // Clear inputs and refresh balances upon successful confirmation
  React.useEffect(() => {
    if (redeemStatus === 'confirmed') {
      setSharesInput('');
      refetchShareBalance();
      refetchAssetBalance();
      refetchPreview();
    }
  }, [redeemStatus]);

  // Derive Fee and Gross Assets values from the on-chain preview (Fee is 0.25% in FeeLib.sol)
  const quoteValues = React.useMemo(() => {
    if (netAssetsOut === undefined || netAssetsOut === 0n) return null;

    // grossOut = (netOut * 10000) / 9975
    const grossAssets = (netAssetsOut * 10000n) / 9975n;
    const protocolFee = grossAssets - netAssetsOut;

    return {
      grossAssets,
      protocolFee,
      netAssetsOut,
    };
  }, [netAssetsOut]);

  const exchangeRate = React.useMemo(() => {
    if (!netAssetsOut || parsedShares === 0n) return 0;
    const netAssetsScaled = netAssetsOut * 10n ** BigInt(18 - selectedAsset.decimals);
    return Number(netAssetsScaled) / Number(parsedShares);
  }, [netAssetsOut, parsedShares, selectedAsset]);

  return (
    <Container>
      <PageWrapper className="space-y-6 max-w-5xl mx-auto">
        {/* HEADER SECTION */}
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="w-8 h-8 text-primary" />
            <span>Redeem Vault Shares</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Burn your UVBTCETH index shares to withdraw your collateral assets back to your wallet.
          </p>
        </div>

        {!isConnected ? (
          <div className="min-h-[350px] rounded-xl border border-border bg-card/40 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
            <Wallet className="w-12 h-12 text-primary/40" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Wallet Connection Required</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Connect your Web3 wallet to read your share holdings and withdraw collateral.
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
              <h2 className="text-base font-semibold text-foreground">
                Interactive Withdrawal Form
              </h2>

              {/* Shares Input field container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Enter Shares to Burn</span>
                  <span className="text-muted-foreground">
                    Holding:{' '}
                    {isLoadingShareBalance || isLoadingTokenAddress ? (
                      <span className="inline-block w-8 h-3 rounded bg-secondary animate-pulse" />
                    ) : (
                      <span
                        className="text-foreground hover:text-primary cursor-pointer transition-colors"
                        onClick={handleMaxClick}
                        title="Click to burn all shares"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleMaxClick()}
                      >
                        {shareBalance !== undefined
                          ? `${formatBigInt(shareBalance, 18, 4)} UVBTCETH`
                          : '0.0000 UVBTCETH'}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-secondary/30 border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
                  {/* Selected collateral asset display (receives this asset) */}
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
                              setSharesInput('');
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
                    value={sharesInput}
                    disabled={isInputLocked}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setSharesInput(val.replace(',', '.'));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent border-none text-foreground text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 text-right pr-2 disabled:opacity-50"
                    aria-label="Redeem shares amount input"
                  />

                  <button
                    onClick={handleMaxClick}
                    disabled={isInputLocked || !shareBalance}
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
                  <span className="font-medium">Insufficient UVBTCETH share balance.</span>
                </div>
              )}

              {/* TRANSACTION LIFECYCLE ALERTS */}
              {redeemStatus !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-1.5 animate-fadeIn ${
                    redeemStatus === 'confirmed'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : redeemErrorMessage
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-primary/5 border-primary/20 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {redeemStatus === 'submitting' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {redeemStatus === 'pending' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {redeemStatus === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
                    {redeemErrorMessage && <AlertTriangle className="w-4 h-4" />}

                    <span>
                      {redeemStatus === 'submitting' && 'Waiting for Signature...'}
                      {redeemStatus === 'pending' && 'Confirming Redemption on BaseScan...'}
                      {redeemStatus === 'confirmed' && 'Redemption Completed Successfully!'}
                      {redeemErrorMessage && 'Redemption Failed'}
                    </span>
                  </div>
                  {redeemErrorMessage && (
                    <p className="text-2xs font-medium opacity-90 pl-6 leading-relaxed">
                      {redeemErrorMessage}
                    </p>
                  )}
                  {redeemStatus === 'confirmed' && (
                    <p className="text-2xs font-medium opacity-90 pl-6">
                      Your shares have been burned and collateral has been returned to your wallet.
                    </p>
                  )}
                </div>
              )}

              {/* REDEEM ACTION BUTTON */}
              <button
                onClick={handleRedeem}
                disabled={
                  isInputLocked ||
                  hasInsufficientBalance ||
                  parsedShares === 0n ||
                  !quoteValues ||
                  isLoadingPreview
                }
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all focus:outline-none disabled:opacity-50"
              >
                {redeemStatus === 'submitting' && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                {redeemStatus === 'pending' && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                <span>
                  {redeemStatus === 'submitting' && 'Waiting for Wallet Signature...'}
                  {redeemStatus === 'pending' && 'Burning shares...'}
                  {redeemStatus === 'idle' && `Redeem for ${selectedAsset.symbol}`}
                  {redeemStatus === 'confirmed' && 'Redeem Completed'}
                </span>
              </button>
            </div>

            {/* RIGHT COLUMN: YIELD PREVIEW & ASSET DETAILS */}
            <div className="md:col-span-5 space-y-6">
              {/* LIVE REDEEM PREVIEW CARD */}
              <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h2 className="text-base font-semibold text-foreground">Redemption Preview</h2>

                {parsedShares === 0n ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                    <Info className="w-8 h-8 text-muted-foreground/30" />
                    <p>Enter an amount of shares to preview your collateral withdrawal quote.</p>
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
                ) : quoteValues ? (
                  <div className="space-y-3.5">
                    {/* Share preview details */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Underlying Returned</span>
                      <span className="text-foreground font-bold">
                        {formatBigInt(quoteValues.netAssetsOut, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Exchange Rate</span>
                      <span className="text-foreground font-semibold">
                        1 Share ≈ {exchangeRate.toFixed(4)} {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="h-px bg-border/50 my-1" />

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Shares Burned</span>
                      <span className="text-muted-foreground font-semibold">
                        {formatBigInt(parsedShares, 18, 4)} UVBTCETH
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">
                        Gross Collateral Out
                      </span>
                      <span className="text-muted-foreground font-semibold">
                        {formatBigInt(quoteValues.grossAssets, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">
                        Exit Protocol Fee (0.25%)
                      </span>
                      <span className="text-destructive/80 font-medium">
                        -{formatBigInt(quoteValues.protocolFee, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Net Assets Credited</span>
                      <span className="text-primary font-bold">
                        {formatBigInt(quoteValues.netAssetsOut, selectedAsset.decimals, 4)}{' '}
                        {selectedAsset.symbol}
                      </span>
                    </div>
                  </div>
                ) : isPreviewError ? (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                    <span className="font-semibold leading-relaxed">
                      Withdrawal preview failed. Oracle price may be stale or vault liquidity
                      insufficient.
                    </span>
                  </div>
                ) : null}
              </div>

              {/* UNIFYVAULT WALLET SUMMARY */}
              <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h2 className="text-base font-semibold text-foreground">Wallet Balances</h2>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Collateral Balance</span>
                    <span className="text-foreground font-bold">
                      {isLoadingAssetBalance ? (
                        <span className="inline-block w-12 h-3 rounded bg-secondary animate-pulse" />
                      ) : assetBalance !== undefined ? (
                        `${formatBigInt(assetBalance, selectedAsset.decimals, 4)} ${selectedAsset.symbol}`
                      ) : (
                        `0.0000 ${selectedAsset.symbol}`
                      )}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-muted-foreground leading-relaxed text-2xs space-y-2">
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Info className="w-3.5 h-3.5" />
                      <span>REDEMPTION INFO</span>
                    </div>
                    <p>
                      Redemptions are executed directly by burning Index shares. A 0.25% exit fee is
                      collected by the protocol and routed to the treasury. No spend allowance
                      approvals are required when burning your own shares.
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
