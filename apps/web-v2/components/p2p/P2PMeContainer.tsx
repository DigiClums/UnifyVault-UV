'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Coins,
  Globe2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { createOrders } from '@p2pdotme/sdk/orders';
import {
  Checkout,
  type PlaceOrderContext,
  type PlaceOrderResult,
} from '@p2pdotme/widgets/checkout';
import {
  Cashout,
  type PlaceCashoutContext,
  type PlaceCashoutResult,
  type DeliverUpiContext,
  type ReconcileContext,
} from '@p2pdotme/widgets/cashout';
import { PaymentHistory } from '@p2pdotme/widgets/payment-history';
import {
  SUPPORTED_P2P_CURRENCIES,
  createCheckoutSigner,
  getOrCreateRelayIdentity,
  createWalletScopedRelayStore,
  resolveP2PNetworkConfig,
  UNIFYVAULT_P2P_THEME,
} from '../../lib/p2p/p2pMeAdapter';

export function P2PMeContainer() {
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'history'>('buy');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  // Dynamic chain network resolution
  const activeNetworkConfig = useMemo(() => {
    return resolveP2PNetworkConfig(chainId);
  }, [chainId]);

  const currentChainId = activeNetworkConfig.chainId;
  const isBaseMainnet = currentChainId === base.id;

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: isBaseMainnet ? base : baseSepolia,
      transport: http(),
    });
  }, [isBaseMainnet]);

  // Signer adapter for widgets
  const checkoutSigner = useMemo(() => {
    return createCheckoutSigner(walletClient, address);
  }, [walletClient, address]);

  // SDK orders client with wallet-scoped relay identity store
  const ordersClient = useMemo(() => {
    return createOrders({
      publicClient,
      diamondAddress: activeNetworkConfig.diamondAddress,
      usdcAddress: activeNetworkConfig.usdcAddress,
      subgraphUrl: activeNetworkConfig.subgraphUrl,
      relayIdentityStore: createWalletScopedRelayStore(address),
    });
  }, [publicClient, activeNetworkConfig, address]);

  /**
   * Buy Flow placeOrder handler (Checkout widget)
   */
  const handlePlaceOrder = useCallback(
    async (ctx: PlaceOrderContext): Promise<PlaceOrderResult> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected. Please connect your wallet.');
      }
      if (!ctx.currency) {
        throw new Error('Please select a payment currency.');
      }

      const relayIdentity = await getOrCreateRelayIdentity(address);

      const placeRes = await ordersClient.placeOrder.execute({
        walletClient: walletClient as any,
        waitForReceipt: true,
        orderType: 0, // BUY
        currency: ctx.currency.symbol as any,
        user: address,
        recipientAddr: address,
        amount: ctx.usdcAmount ?? 10_000_000n, // default 10 USDC if not passed
        fiatAmount: ctx.fiatAmount ?? 0n,
        preferredPaymentChannelConfigId: ctx.currency.paymentChannelConfigId ?? 0n,
        pubKey: relayIdentity.publicKey,
      });

      if (placeRes.isErr()) {
        throw new Error(placeRes.error.message || 'Failed to place buy order.');
      }

      const orderId = placeRes.value.meta?.orderId?.toString();
      if (!orderId) {
        throw new Error('Order ID was not received from receipt.');
      }

      return {
        orderId,
        txHash: placeRes.value.hash,
      };
    },
    [walletClient, address, ordersClient],
  );

  /**
   * Cashout Flow: placeCashout handler
   */
  const handlePlaceCashout = useCallback(
    async (ctx: PlaceCashoutContext): Promise<PlaceCashoutResult> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected. Please connect your wallet.');
      }

      // 1. Approve USDC to diamond contract if needed
      const totalAmount = ctx.usdcAmount + ctx.feeUsdc;
      const approveRes = await ordersClient.approveUsdc.execute({
        walletClient: walletClient as any,
        amount: totalAmount,
        waitForReceipt: true,
      });

      if (approveRes.isErr()) {
        throw new Error(approveRes.error.message || 'USDC Approval failed.');
      }

      // 2. Place SELL order on Diamond
      const placeRes = await ordersClient.placeOrder.execute({
        walletClient: walletClient as any,
        waitForReceipt: true,
        orderType: 1, // SELL
        currency: ctx.currency.symbol as any,
        user: address,
        recipientAddr: address,
        amount: ctx.usdcAmount,
        fiatAmount: 0n,
        preferredPaymentChannelConfigId: ctx.currency.paymentChannelConfigId ?? 0n,
        pubKey: ctx.userPubKey,
      });

      if (placeRes.isErr()) {
        throw new Error(placeRes.error.message || 'Failed to initiate cashout.');
      }

      const orderId = placeRes.value.meta?.orderId?.toString();
      if (!orderId) {
        throw new Error('Cashout orderId not found in receipt.');
      }

      return {
        orderId,
        txHash: placeRes.value.hash,
      };
    },
    [walletClient, address, ordersClient],
  );

  /**
   * Cashout Flow: deliverUpi handler (Delivers encrypted payment address)
   */
  const handleDeliverUpi = useCallback(
    async (ctx: DeliverUpiContext): Promise<{ txHash: string }> => {
      if (!walletClient || !address) throw new Error('WalletClient unavailable');

      const data = encodeFunctionData({
        abi: [
          {
            name: 'setSellOrderUpi',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'orderId', type: 'uint256' },
              { name: 'encUpi', type: 'string' },
              { name: 'preferredPaymentChannelConfigId', type: 'uint256' },
            ],
            outputs: [],
          },
        ] as const,
        functionName: 'setSellOrderUpi',
        args: [BigInt(ctx.orderId), ctx.encryptedUpi, 0n],
      });

      const hash = await walletClient.sendTransaction({
        to: activeNetworkConfig.diamondAddress,
        data,
        account: address,
        chain: walletClient.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      return { txHash: hash };
    },
    [walletClient, address, publicClient, activeNetworkConfig],
  );

  /**
   * Cashout Flow: reconcile handler
   */
  const handleReconcile = useCallback(
    async (ctx: ReconcileContext): Promise<{ txHash: string }> => {
      console.log(`[P2P.me] Reconciling order #${ctx.orderId} with status ${ctx.status}`);
      return { txHash: '0x' };
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-6 border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#BFFF00] border-2 border-black p-1 shadow-[3px_3px_0_#000] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-sans">
                P2P Fiat Gateway
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#BFFF00] text-black border border-black rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by P2P.me
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buy and sell USDC with UPI, PIX, SPEI, and QRIS with zero-slippage automated peer
              matching on Base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://p2p.me"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-surface hover:bg-muted text-foreground font-bold text-xs border-2 border-black dark:border-white/10 shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span>P2P Protocol</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b-2 border-black dark:border-white/10 pb-4">
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border-2 border-black dark:border-white/10 shadow-[3px_3px_0_#000]">
          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'buy'
                ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Buy USDC (Onramp)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sell')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'sell'
                ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Cashout (Offramp)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'history'
                ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Orders History</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeNetworkConfig.chainName} Diamond Active</span>
        </div>
      </div>

      {/* Completion Alert */}
      {completedOrderId && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-bold font-mono">
              Order #{completedOrderId} successfully completed! Funds settled to your wallet.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompletedOrderId(null)}
            className="text-xs font-bold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Wallet Connection Requirement */}
      {!isConnected || !checkoutSigner ? (
        <div className="p-10 rounded-2xl bg-surface border-2 border-black dark:border-white/10 text-center space-y-4 shadow-[6px_6px_0_#000]">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-foreground font-sans">
            Connect Your Wallet to Access P2P Gateway
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Connect your Web3 wallet on Base to initiate peer-to-peer fiat onramp and offramp orders
            with encrypted verification.
          </p>
        </div>
      ) : (
        <div className="max-w-xl mx-auto">
          {/* TAB 1: BUY FLOW */}
          {activeTab === 'buy' && (
            <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-background p-6 shadow-[6px_6px_0_#000]">
              <div className="mb-4">
                <h2 className="text-base font-black text-foreground">Buy USDC via Local Fiat</h2>
                <p className="text-xs text-muted-foreground">
                  Pay via UPI, PIX, SPEI, or QRIS. Merchant receives fiat off-chain; you receive
                  USDC on {activeNetworkConfig.chainName}.
                </p>
              </div>

              <Checkout
                signer={checkoutSigner}
                currencies={SUPPORTED_P2P_CURRENCIES}
                amount="10 USDC"
                usdcAmount={10_000_000n}
                productName="UnifyVault USDC Deposit"
                chainId={currentChainId}
                diamondAddress={activeNetworkConfig.diamondAddress}
                usdcAddress={activeNetworkConfig.usdcAddress}
                subgraphUrl={activeNetworkConfig.subgraphUrl}
                theme={UNIFYVAULT_P2P_THEME}
                placeOrder={handlePlaceOrder}
                onComplete={(orderId) => {
                  setCompletedOrderId(orderId);
                }}
                onError={(err) => {
                  console.error('[P2P.me Checkout Error]:', err);
                }}
              />
            </div>
          )}

          {/* TAB 2: SELL / CASHOUT FLOW */}
          {activeTab === 'sell' && (
            <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-background p-6 shadow-[6px_6px_0_#000]">
              <div className="mb-4">
                <h2 className="text-base font-black text-foreground">Cashout USDC to Local Fiat</h2>
                <p className="text-xs text-muted-foreground">
                  Convert USDC from your wallet into local bank/UPI/PIX deposits safely via P2P
                  escrow.
                </p>
              </div>

              <Cashout
                signer={checkoutSigner}
                currencies={SUPPORTED_P2P_CURRENCIES}
                usdcAddress={activeNetworkConfig.usdcAddress}
                diamondAddress={activeNetworkConfig.diamondAddress}
                subgraphUrl={activeNetworkConfig.subgraphUrl}
                theme={UNIFYVAULT_P2P_THEME}
                placeCashout={handlePlaceCashout}
                deliverUpi={handleDeliverUpi}
                reconcile={handleReconcile}
                onComplete={(orderId) => {
                  setCompletedOrderId(orderId);
                }}
                onError={(err) => {
                  console.error('[P2P.me Cashout Error]:', err);
                }}
              />
            </div>
          )}

          {/* TAB 3: ORDER HISTORY */}
          {activeTab === 'history' && (
            <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-background p-6 shadow-[6px_6px_0_#000]">
              <div className="mb-4">
                <h2 className="text-base font-black text-foreground">P2P Order History</h2>
                <p className="text-xs text-muted-foreground">
                  View and manage past and active P2P.me peer orders on{' '}
                  {activeNetworkConfig.chainName}.
                </p>
              </div>

              <PaymentHistory
                signer={checkoutSigner}
                diamondAddress={activeNetworkConfig.diamondAddress}
                usdcAddress={activeNetworkConfig.usdcAddress}
                subgraphUrl={activeNetworkConfig.subgraphUrl}
                theme={UNIFYVAULT_P2P_THEME}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
