'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useLivePrices } from './useLivePrices';

export type PulseAsset = 'BTC' | 'ETH';
export type PulseDirection = 'UP' | 'DOWN';
export type PulsePhase = 'BETTING' | 'LIVE' | 'SETTLED';

export interface PulseRound {
  id: number;
  asset: PulseAsset;
  phase: PulsePhase;
  startTime: number;
  lockTime: number;
  endTime: number;
  strikePrice: number;
  closePrice: number;
  upPoolUVBE: number;
  downPoolUVBE: number;
  totalPoolUVBE: number;
  winningDirection: PulseDirection | 'DRAW' | null;
  userBet: {
    direction: PulseDirection;
    amountUVBE: number;
    claimed: boolean;
    potentialWinUVBE: number;
    customMultiplier?: number;
  } | null;
}

export interface RecentWinner {
  id: string;
  address: string;
  asset: PulseAsset;
  direction: PulseDirection;
  payoutUVBE: number;
  multiplier: string;
  timeAgo: string;
}

const ROUND_BET_DURATION_SEC = 10;
const ROUND_LIVE_DURATION_SEC = 20;
const TOTAL_ROUND_SEC = ROUND_BET_DURATION_SEC + ROUND_LIVE_DURATION_SEC; // 30s
const PROTOCOL_FEE_BPS = 250; // 2.5% house edge / treasury rake

export function useFlashPulse() {
  const { address } = useAccount();
  const livePrices = useLivePrices();
  const [selectedAsset, setSelectedAsset] = useState<PulseAsset>('BTC');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(ROUND_BET_DURATION_SEC);
  const [roundCounter, setRoundCounter] = useState<number>(1042);
  const [history, setHistory] = useState<PulseRound[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [userScore, setUserScore] = useState({ wins: 0, totalWonUVBE: 0, streak: 0 });

  // Gasless Vault Balance State
  const [vaultBalance, setVaultBalance] = useState<{
    depositedUVBE: number;
    lockedUVBE: number;
    availableUVBE: number;
  }>({ depositedUVBE: 100, lockedUVBE: 0, availableUVBE: 100 });
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(false);

  const effectiveAddress = address || '0x441dbf8076d0b143EC17199baE94Daa884161454';

  // Fetch Vault Balance from API
  const refreshVaultBalance = useCallback(async () => {
    if (!effectiveAddress) return;
    try {
      const res = await fetch(`/api/flashpulse?address=${effectiveAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.balance) {
          setVaultBalance(data.balance);
        }
      }
    } catch {
      // fallback to optimistic
    }
  }, [effectiveAddress]);

  useEffect(() => {
    refreshVaultBalance();
  }, [refreshVaultBalance]);

  // Current active round state
  const [activeRound, setActiveRound] = useState<PulseRound>({
    id: 1042,
    asset: 'BTC',
    phase: 'BETTING',
    startTime: Date.now(),
    lockTime: Date.now() + ROUND_BET_DURATION_SEC * 1000,
    endTime: Date.now() + TOTAL_ROUND_SEC * 1000,
    strikePrice: 0,
    closePrice: 0,
    upPoolUVBE: 150.0,
    downPoolUVBE: 120.0,
    totalPoolUVBE: 270.0,
    winningDirection: null,
    userBet: null,
  });

  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);

  // Track live price for selected asset
  const currentLivePrice =
    selectedAsset === 'BTC' ? livePrices.btcPriceUSD : livePrices.ethPriceUSD;

  // Keep price history for sparkline animation
  useEffect(() => {
    if (!currentLivePrice) return;
    setPriceHistory((prev) => {
      const next = [...prev, { time: Date.now(), price: currentLivePrice }];
      return next.slice(-40); // keep last 40 ticks
    });
  }, [currentLivePrice]);

  // Initial mock recent winners feed
  useEffect(() => {
    const mockWinners: RecentWinner[] = [
      {
        id: '1',
        address: '0x44...1454',
        asset: 'BTC',
        direction: 'UP',
        payoutUVBE: 48.5,
        multiplier: '1.94x',
        timeAgo: '12s ago',
      },
      {
        id: '2',
        address: '0x79...98c1',
        asset: 'ETH',
        direction: 'DOWN',
        payoutUVBE: 120.0,
        multiplier: '2.40x',
        timeAgo: '42s ago',
      },
      {
        id: '3',
        address: '0xa2...55e0',
        asset: 'BTC',
        direction: 'UP',
        payoutUVBE: 19.5,
        multiplier: '1.95x',
        timeAgo: '1m ago',
      },
    ];
    setRecentWinners(mockWinners);
  }, []);

  // Multiplier calculations (Parimutuel Pool Model)
  const calculateMultipliers = useCallback((upPool: number, downPool: number) => {
    const total = upPool + downPool;
    const distributable = total * (1 - PROTOCOL_FEE_BPS / 10000);
    const upMultiplier = upPool > 0 ? distributable / upPool : 1.95;
    const downMultiplier = downPool > 0 ? distributable / downPool : 1.95;
    return {
      up: Math.max(1.05, Math.min(10.0, Number(upMultiplier.toFixed(2)))),
      down: Math.max(1.05, Math.min(10.0, Number(downMultiplier.toFixed(2)))),
    };
  }, []);

  const multipliers = calculateMultipliers(activeRound.upPoolUVBE, activeRound.downPoolUVBE);

  // Round ticker loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setActiveRound((curr) => {
        // Phase 1: BETTING -> LIVE
        if (curr.phase === 'BETTING' && now >= curr.lockTime) {
          const strike = currentLivePrice || (curr.asset === 'BTC' ? 78400 : 2480);
          setSecondsRemaining(ROUND_LIVE_DURATION_SEC);
          return {
            ...curr,
            phase: 'LIVE',
            strikePrice: strike,
          };
        }

        // Phase 2: LIVE -> SETTLED
        if (curr.phase === 'LIVE' && now >= curr.endTime) {
          const close = currentLivePrice || curr.strikePrice;
          const wonDir: PulseDirection | 'DRAW' =
            close > curr.strikePrice ? 'UP' : close < curr.strikePrice ? 'DOWN' : 'DRAW';

          // Check if user won
          if (curr.userBet && curr.userBet.direction === wonDir) {
            const defaultMult =
              wonDir === 'UP'
                ? calculateMultipliers(curr.upPoolUVBE, curr.downPoolUVBE).up
                : calculateMultipliers(curr.upPoolUVBE, curr.downPoolUVBE).down;
            const mult = curr.userBet.customMultiplier || defaultMult;
            const payout = curr.userBet.amountUVBE * mult;

            setUserScore((prev) => ({
              wins: prev.wins + 1,
              totalWonUVBE: prev.totalWonUVBE + payout,
              streak: prev.streak + 1,
            }));

            // Sync API for Win Credit
            fetch('/api/flashpulse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'SETTLE_WIN',
                address: effectiveAddress,
                betAmountUVBE: curr.userBet.amountUVBE,
                payoutUVBE: payout,
              }),
            })
              .then((r) => r.json())
              .then((d) => d.balance && setVaultBalance(d.balance))
              .catch(() => {});

            setRecentWinners((prev) => [
              {
                id: String(Date.now()),
                address: effectiveAddress ? `${effectiveAddress.slice(0, 4)}...${effectiveAddress.slice(-4)}` : 'You',
                asset: curr.asset,
                direction: wonDir,
                payoutUVBE: Number(payout.toFixed(2)),
                multiplier: `${mult}x`,
                timeAgo: 'Just now',
              },
              ...prev.slice(0, 9),
            ]);
          } else if (curr.userBet) {
            setUserScore((prev) => ({ ...prev, streak: 0 }));

            // Sync API for Loss Debit
            fetch('/api/flashpulse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'SETTLE_LOSS',
                address: effectiveAddress,
                betAmountUVBE: curr.userBet.amountUVBE,
              }),
            })
              .then((r) => r.json())
              .then((d) => d.balance && setVaultBalance(d.balance))
              .catch(() => {});
          }

          // Move to history
          const settledRound: PulseRound = {
            ...curr,
            phase: 'SETTLED',
            closePrice: close,
            winningDirection: wonDir,
          };
          setHistory((prev) => [settledRound, ...prev.slice(0, 19)]);

          // Start Next Round immediately
          const nextId = curr.id + 1;
          setRoundCounter(nextId);
          setSecondsRemaining(ROUND_BET_DURATION_SEC);

          // Simulated organic community pool for next round
          const basePool = curr.asset === 'BTC' ? 180 : 120;
          const randomSkew = (Math.random() - 0.5) * 60;
          const nextUp = Math.max(20, basePool + randomSkew);
          const nextDown = Math.max(20, basePool - randomSkew);

          return {
            id: nextId,
            asset: selectedAsset,
            phase: 'BETTING',
            startTime: now,
            lockTime: now + ROUND_BET_DURATION_SEC * 1000,
            endTime: now + TOTAL_ROUND_SEC * 1000,
            strikePrice: 0,
            closePrice: 0,
            upPoolUVBE: Number(nextUp.toFixed(1)),
            downPoolUVBE: Number(nextDown.toFixed(1)),
            totalPoolUVBE: Number((nextUp + nextDown).toFixed(1)),
            winningDirection: null,
            userBet: null,
          };
        }

        // Countdown calculation
        if (curr.phase === 'BETTING') {
          const rem = Math.max(0, Math.ceil((curr.lockTime - now) / 1000));
          setSecondsRemaining(rem);
        } else if (curr.phase === 'LIVE') {
          const rem = Math.max(0, Math.ceil((curr.endTime - now) / 1000));
          setSecondsRemaining(rem);
        }

        return curr;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [currentLivePrice, calculateMultipliers, selectedAsset, effectiveAddress]);

  // Place Bet Handler with Gasless Vault Deductions & Custom Multipliers
  const placeBet = useCallback(
    async (direction: PulseDirection, amountUVBE: number, customMultiplier?: number) => {
      if (activeRound.phase !== 'BETTING') {
        return { success: false, error: 'Round is locked for live settlement' };
      }
      if (amountUVBE <= 0) {
        return { success: false, error: 'Enter a valid bet amount' };
      }
      if (vaultBalance.availableUVBE < amountUVBE) {
        return { success: false, error: 'Insufficient UVBE in Gasless Game Vault. Please Deposit.' };
      }

      // Optimistic balance update
      setVaultBalance((prev) => ({
        ...prev,
        availableUVBE: prev.availableUVBE - amountUVBE,
        lockedUVBE: prev.lockedUVBE + amountUVBE,
      }));

      // Call API lock
      fetch('/api/flashpulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOCK_BET',
          address: effectiveAddress,
          amountUVBE,
          direction,
          multiplier: customMultiplier,
        }),
      }).catch(() => {});

      const defaultMult = direction === 'UP' ? multipliers.up : multipliers.down;
      const mult = customMultiplier || defaultMult;
      const potentialWin = amountUVBE * mult;

      setActiveRound((curr) => {
        const addedUp = direction === 'UP' ? amountUVBE : 0;
        const addedDown = direction === 'DOWN' ? amountUVBE : 0;
        const newUp = curr.upPoolUVBE + addedUp;
        const newDown = curr.downPoolUVBE + addedDown;

        return {
          ...curr,
          upPoolUVBE: Number(newUp.toFixed(2)),
          downPoolUVBE: Number(newDown.toFixed(2)),
          totalPoolUVBE: Number((newUp + newDown).toFixed(2)),
          userBet: {
            direction,
            amountUVBE,
            claimed: false,
            potentialWinUVBE: Number(potentialWin.toFixed(2)),
            customMultiplier: mult,
          },
        };
      });

      return { success: true };
    },
    [activeRound.phase, multipliers, vaultBalance.availableUVBE, effectiveAddress],
  );

  // Deposit into Gasless Vault
  const depositToVault = async (amount: number) => {
    setIsVaultLoading(true);
    try {
      const res = await fetch('/api/flashpulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEPOSIT',
          address: effectiveAddress,
          amountUVBE: amount,
        }),
      });
      const data = await res.json();
      if (data.balance) {
        setVaultBalance(data.balance);
      }
      setIsVaultLoading(false);
      return { success: true };
    } catch {
      setIsVaultLoading(false);
      return { success: false, error: 'Deposit failed' };
    }
  };

  // Withdraw from Gasless Vault
  const withdrawFromVault = async (amount: number) => {
    setIsVaultLoading(true);
    try {
      const res = await fetch('/api/flashpulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WITHDRAW',
          address: effectiveAddress,
          amountUVBE: amount,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setIsVaultLoading(false);
        return { success: false, error: data.error };
      }
      if (data.balance) {
        setVaultBalance(data.balance);
      }
      setIsVaultLoading(false);
      return { success: true };
    } catch {
      setIsVaultLoading(false);
      return { success: false, error: 'Withdrawal failed' };
    }
  };

  return {
    selectedAsset,
    setSelectedAsset,
    activeRound,
    secondsRemaining,
    multipliers,
    currentLivePrice,
    priceHistory,
    placeBet,
    history,
    recentWinners,
    userScore,
    protocolFeePercent: (PROTOCOL_FEE_BPS / 100).toFixed(1),
    vaultBalance,
    depositToVault,
    withdrawFromVault,
    isVaultLoading,
  };
}
