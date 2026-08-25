'use client';

import React, { useState } from 'react';
import { useFlashPulse, PulseDirection, PulseAsset } from '../../hooks/useFlashPulse';
import { formatUSD } from '../../lib/math';
import { TokenIcon } from '../ui/TokenIcon';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Timer,
  ShieldCheck,
  Award,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Info,
  CheckCircle2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function FlashPulseArena() {
  const {
    selectedAsset,
    setSelectedAsset,
    activeRound,
    secondsRemaining,
    multipliers,
    currentLivePrice,
    placeBet,
    history,
    recentWinners,
    userScore,
    protocolFeePercent,
    vaultBalance,
    depositToVault,
    withdrawFromVault,
    isVaultLoading,
  } = useFlashPulse();

  const [betAmount, setBetAmount] = useState<string>('5');
  const [selectedMultiplier, setSelectedMultiplier] = useState<number | 'AUTO'>('AUTO');
  const [betToast, setBetToast] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [vaultActionAmount, setVaultActionAmount] = useState<string>('50');

  const numBet = parseFloat(betAmount) || 0;
  const isBetting = activeRound.phase === 'BETTING';
  const isLive = activeRound.phase === 'LIVE';

  // Live delta calculation when live
  const priceDelta =
    isLive && activeRound.strikePrice > 0
      ? currentLivePrice - activeRound.strikePrice
      : 0;
  const isWinningUp = priceDelta > 0;
  const isWinningDown = priceDelta < 0;

  const handlePlaceBet = async (dir: PulseDirection) => {
    if (!isBetting) return;
    if (numBet <= 0) {
      setBetToast('⚠️ Enter a valid UVBE amount');
      setTimeout(() => setBetToast(null), 3000);
      return;
    }
    if (vaultBalance.availableUVBE < numBet) {
      setBetToast('⚠️ Insufficient UVBE in Gasless Vault. Click +Deposit below.');
      setTimeout(() => setBetToast(null), 4000);
      return;
    }
    const customMult = selectedMultiplier === 'AUTO' ? undefined : selectedMultiplier;
    const res = await placeBet(dir, numBet, customMult);
    if (res.success) {
      const activeMult = customMult || (dir === 'UP' ? multipliers.up : multipliers.down);
      setBetToast(`✅ Bet locked: ${numBet} UVBE on ${dir} @ ${activeMult}x! (Gasless)`);
      setTimeout(() => setBetToast(null), 3500);
    } else if (res.error) {
      setBetToast(`❌ ${res.error}`);
      setTimeout(() => setBetToast(null), 3500);
    }
  };

  const handleDeposit = async () => {
    const amt = parseFloat(vaultActionAmount) || 0;
    if (amt <= 0) return;
    const res = await depositToVault(amt);
    if (res.success) {
      setBetToast(`✅ Deposited +${amt} UVBE into Gasless Vault!`);
      setShowVaultModal(false);
      setTimeout(() => setBetToast(null), 3500);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(vaultActionAmount) || 0;
    if (amt <= 0) return;
    const res = await withdrawFromVault(amt);
    if (res.success) {
      setBetToast(`✅ Withdrew ${amt} UVBE back to Main Wallet!`);
      setShowVaultModal(false);
      setTimeout(() => setBetToast(null), 3500);
    } else if (res.error) {
      setBetToast(`❌ ${res.error}`);
      setTimeout(() => setBetToast(null), 3500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* ── 0. GASLESS GAME VAULT BALANCE BANNER ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 text-white border-2 border-black dark:border-white/15 flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0_#BFFF00]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFFF00] text-black font-black flex items-center justify-center border-2 border-black">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <span>Gasless Game Vault (1-Tap Zero Gas Bets)</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] rounded font-mono font-bold">Active</span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-white flex items-center gap-2 mt-0.5">
              <span>{vaultBalance.availableUVBE.toFixed(2)} UVBE Available</span>
              {vaultBalance.lockedUVBE > 0 && (
                <span className="text-xs text-amber-400 font-normal">({vaultBalance.lockedUVBE.toFixed(2)} in round)</span>
              )}
            </div>
          </div>
        </div>

        {/* Vault Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVaultModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black text-xs font-mono transition-all transform active:scale-95 border-2 border-black shadow-[2px_2px_0_#000] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Deposit / Top Up</span>
          </button>
        </div>
      </div>

      {/* ── 1. TOP STATS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Stat 1: 24h Wins */}
        <div className="p-3 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#BFFF00] text-black font-black flex items-center justify-center border border-black">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Your Wins</div>
            <div className="text-sm font-black font-mono text-foreground">{userScore.wins} Rounds</div>
          </div>
        </div>

        {/* Stat 2: Total Won */}
        <div className="p-3 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Payout</div>
            <div className="text-sm font-black font-mono text-emerald-500">+{userScore.totalWonUVBE.toFixed(2)} UVBE</div>
          </div>
        </div>

        {/* Stat 3: Win Streak */}
        <div className="p-3 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 font-black flex items-center justify-center border border-amber-500/30">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Win Streak</div>
            <div className="text-sm font-black font-mono text-amber-500">{userScore.streak} 🔥</div>
          </div>
        </div>

        {/* Stat 4: Treasury Rake */}
        <div className="p-3 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-500 font-black flex items-center justify-center border border-blue-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Treasury Rake</div>
            <div className="text-sm font-black font-mono text-foreground">{protocolFeePercent}% UVBE</div>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN ARENA CONTAINER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-6 shadow-[6px_6px_0_#BFFF00]">
        {/* Top Glow Bar */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />

        {/* Header: Asset Switcher & Round Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* BTC Selector */}
            <button
              onClick={() => setSelectedAsset('BTC')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer',
                selectedAsset === 'BTC'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-2xs'
                  : 'bg-card border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
              )}
            >
              <TokenIcon symbol="BTC" size={18} />
              <span>BTC/USD 30s</span>
            </button>

            {/* ETH Selector */}
            <button
              onClick={() => setSelectedAsset('ETH')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer',
                selectedAsset === 'ETH'
                  ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-2xs'
                  : 'bg-card border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground'
              )}
            >
              <TokenIcon symbol="ETH" size={18} />
              <span>ETH/USD 30s</span>
            </button>
          </div>

          {/* Round Tag & Countdown Clock */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs text-muted-foreground">Round #{activeRound.id}</span>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 text-xs font-black',
                isBetting
                  ? 'bg-[#BFFF00]/15 border-[#BFFF00] text-[#5f8f00] dark:text-[#BFFF00] animate-pulse'
                  : 'bg-rose-500/15 border-rose-500 text-rose-500'
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{isBetting ? `BETTING: ${secondsRemaining}s` : `LIVE LOCK: ${secondsRemaining}s`}</span>
            </div>
          </div>
        </div>

        {/* ── 3. LIVE PRICE TRACKER & SPEEDOMETER ── */}
        <div className="py-6 text-center space-y-3">
          <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Pyth Oracle Real-Time Feed</span>
          </div>

          <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-foreground">
            {formatUSD(currentLivePrice)}
          </div>

          {/* Dynamic Strike / Status Banner */}
          {isLive ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono">
              <span className="text-muted-foreground">Locked Strike: {formatUSD(activeRound.strikePrice)}</span>
              <span
                className={cn(
                  'font-bold px-2 py-0.5 rounded-full',
                  isWinningUp ? 'bg-emerald-500/20 text-emerald-400' : isWinningDown ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-muted-foreground'
                )}
              >
                {priceDelta >= 0 ? `+${priceDelta.toFixed(2)}` : priceDelta.toFixed(2)} USD
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-ping" />
              <span>Locking strike price in {secondsRemaining}s... 1-Tap Bet UVBE below!</span>
            </div>
          )}
        </div>

        {/* ── 4. POOL VOLUME BAR ── */}
        <div className="space-y-1.5 pt-2 pb-4">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-emerald-500 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> UP: {activeRound.upPoolUVBE.toFixed(1)} UVBE ({multipliers.up}x)
            </span>
            <span className="text-rose-500 flex items-center gap-1">
              DOWN: {activeRound.downPoolUVBE.toFixed(1)} UVBE ({multipliers.down}x) <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Ratio bar */}
          <div className="w-full h-3 rounded-full bg-rose-500 overflow-hidden flex border border-black/20">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${(activeRound.upPoolUVBE / (activeRound.totalPoolUVBE || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* ── 5. BETTING INTERFACE & ONE-TAP BUTTONS ── */}
        <div className="space-y-4 pt-2">
          {/* Bet Input & Quick Chips */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-muted-foreground font-mono">Bet:</span>
              <div className="relative flex-1 sm:w-36">
                <input
                  type="number"
                  value={betAmount}
                  disabled={!isBetting}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-card border-2 border-black dark:border-white/20 rounded-xl pl-3 pr-16 py-1.5 text-sm font-black font-mono focus:outline-none focus:border-[#BFFF00]"
                  placeholder="0.00"
                />
                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                  <TokenIcon symbol="UVBE" size={16} />
                  <span className="text-[10px] font-bold text-foreground">UVBE</span>
                </div>
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              {[1, 5, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={!isBetting}
                  onClick={() => setBetAmount(String(amt))}
                  className="flex-1 sm:flex-none px-2.5 py-1 rounded-lg bg-card border border-black/10 dark:border-white/15 hover:border-[#BFFF00] text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {amt} UVBE
                </button>
              ))}
            </div>
          </div>

          {/* Multiplier / Leverage Selector (Auto Pool vs User Custom) */}
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Multiplier / Target Strike:
              </span>
              <span className="font-black text-[#5f8f00] dark:text-[#BFFF00]">
                {selectedMultiplier === 'AUTO'
                  ? '⚡ Auto Pool Odds'
                  : `🔥 ${selectedMultiplier}x Selected (Custom Reward)`}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              <button
                type="button"
                disabled={!isBetting}
                onClick={() => setSelectedMultiplier('AUTO')}
                className={cn(
                  'py-1.5 px-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer text-center',
                  selectedMultiplier === 'AUTO'
                    ? 'bg-[#BFFF00] text-black border-black shadow-[2px_2px_0_#000]'
                    : 'bg-card text-muted-foreground border-black/10 dark:border-white/15 hover:text-foreground'
                )}
              >
                Auto
              </button>
              {[2, 3, 5, 10, 20].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  disabled={!isBetting}
                  onClick={() => setSelectedMultiplier(mult)}
                  className={cn(
                    'py-1.5 px-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer text-center',
                    selectedMultiplier === mult
                      ? 'bg-amber-500 text-black border-black shadow-[2px_2px_0_#000]'
                      : 'bg-card text-muted-foreground border-black/10 dark:border-white/15 hover:text-foreground'
                  )}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>

          {/* UP & DOWN BIG ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* UP BUTTON */}
            <button
              type="button"
              disabled={!isBetting}
              onClick={() => handlePlaceBet('UP')}
              className={cn(
                'group relative p-4 sm:p-5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:scale-95 shadow-[4px_4px_0_#059669]',
                isBetting
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-black'
                  : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-700 cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-1.5 text-base sm:text-xl font-black">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>ROLL UP (1-TAP)</span>
              </div>
              <div className="text-xs sm:text-sm font-mono opacity-90">
                Payout: {selectedMultiplier === 'AUTO' ? `${multipliers.up}x` : `${selectedMultiplier}x`} (Win{' '}
                {(numBet * (selectedMultiplier === 'AUTO' ? multipliers.up : selectedMultiplier)).toFixed(2)} UVBE)
              </div>
            </button>

            {/* DOWN BUTTON */}
            <button
              type="button"
              disabled={!isBetting}
              onClick={() => handlePlaceBet('DOWN')}
              className={cn(
                'group relative p-4 sm:p-5 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:scale-95 shadow-[4px_4px_0_#e11d48]',
                isBetting
                  ? 'bg-rose-500 hover:bg-rose-400 text-black border-black'
                  : 'bg-rose-950/40 border-rose-900/50 text-rose-700 cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-1.5 text-base sm:text-xl font-black">
                <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>ROLL DOWN (1-TAP)</span>
              </div>
              <div className="text-xs sm:text-sm font-mono opacity-90">
                Payout: {selectedMultiplier === 'AUTO' ? `${multipliers.down}x` : `${selectedMultiplier}x`} (Win{' '}
                {(numBet * (selectedMultiplier === 'AUTO' ? multipliers.down : selectedMultiplier)).toFixed(2)} UVBE)
              </div>
            </button>
          </div>

          {/* Bet Confirmation Toast */}
          {betToast && (
            <div className="p-2.5 rounded-xl bg-black text-[#BFFF00] dark:bg-white dark:text-black text-center font-mono font-bold text-xs border border-[#BFFF00] animate-bounce">
              {betToast}
            </div>
          )}

          {/* Active User Bet Indicator */}
          {activeRound.userBet && (
            <div className="p-3 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/40 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#5f8f00] dark:text-[#BFFF00] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Locked on {activeRound.userBet.direction} ({activeRound.userBet.amountUVBE} UVBE)
              </span>
              <span className="font-black text-foreground">
                Potential Win: {activeRound.userBet.potentialWinUVBE} UVBE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. RECENT ROUNDS & LIVE WINNERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Round History */}
        <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Recent 30s Rounds
          </h3>

          <div className="space-y-2">
            {history.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-mono border border-border"
              >
                <span className="font-bold text-muted-foreground">#{r.id} {r.asset}</span>
                <span className="text-foreground">${r.closePrice.toFixed(2)}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md font-bold',
                    r.winningDirection === 'UP'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  )}
                >
                  {r.winningDirection}
                </span>
                <span className="text-muted-foreground">{r.totalPoolUVBE} UVBE Pot</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Winners Feed */}
        <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/15 shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#BFFF00]" /> Live UVBE Payout Feed
          </h3>

          <div className="space-y-2">
            {recentWinners.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-mono border border-border"
              >
                <span className="font-bold text-foreground">{w.address}</span>
                <span className="text-emerald-500 font-bold">+{w.payoutUVBE.toFixed(2)} UVBE</span>
                <span className="text-[#5f8f00] dark:text-[#BFFF00] font-bold">{w.multiplier}</span>
                <span className="text-muted-foreground text-[10px]">{w.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7. GASLESS VAULT DEPOSIT/WITHDRAW MODAL ── */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border-2 border-black dark:border-white/20 rounded-3xl p-5 sm:p-6 shadow-[8px_8px_0_#BFFF00] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <TokenIcon symbol="UVBE" size={24} />
                <h3 className="font-black text-base text-foreground">Gasless Game Vault Manager</h3>
              </div>
              <button
                onClick={() => setShowVaultModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-foreground font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Deposit UVBE into your Game Vault for instant 1-tap gasless predictions without signing transactions every 30 seconds.
              </div>

              <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-border space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Available in Vault:</span>
                  <span className="font-bold text-foreground">{vaultBalance.availableUVBE.toFixed(2)} UVBE</span>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-muted-foreground font-mono">Amount (UVBE):</label>
                <input
                  type="number"
                  value={vaultActionAmount}
                  onChange={(e) => setVaultActionAmount(e.target.value)}
                  className="w-full bg-card border-2 border-black dark:border-white/20 rounded-xl px-3 py-2 text-base font-black font-mono focus:outline-none focus:border-[#BFFF00]"
                  placeholder="50"
                />
              </div>

              <div className="flex gap-2 pt-1">
                {[25, 50, 100, 250].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVaultActionAmount(String(v))}
                    className="flex-1 py-1 rounded-lg bg-card border border-border text-xs font-mono font-bold hover:border-[#BFFF00]"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDeposit}
                disabled={isVaultLoading}
                className="py-3 rounded-xl bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black text-xs font-mono border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVaultLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
                <span>Deposit UVBE</span>
              </button>

              <button
                onClick={handleWithdraw}
                disabled={isVaultLoading}
                className="py-3 rounded-xl bg-card hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-black text-xs font-mono border-2 border-black dark:border-white/20 shadow-[2px_2px_0_rgba(0,0,0,0.85)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVaultLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                <span>Withdraw UVBE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
