'use client';

import React, { useState } from 'react';
import { Match, Player, ContestTier } from '../../lib/fantasy/types';
import { CricketGroundView } from './CricketGroundView';
import {
  ShieldCheck,
  Crown,
  Shield,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  X,
} from 'lucide-react';

interface TeamConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  selectedPlayers: Player[];
  captainId: string;
  viceCaptainId: string;
  teamName: string;
  selectedContest?: ContestTier | null;
  onConfirmJoin: () => void;
}

export function TeamConfirmationModal({
  isOpen,
  onClose,
  match,
  selectedPlayers,
  captainId,
  viceCaptainId,
  teamName,
  selectedContest,
  onConfirmJoin,
}: TeamConfirmationModalProps) {
  const [demoNoticeConfirmed, setDemoNoticeConfirmed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMode, setSuccessMode] = useState(false);

  if (!isOpen) return null;

  const captain = selectedPlayers.find((p) => p.id === captainId);
  const viceCaptain = selectedPlayers.find((p) => p.id === viceCaptainId);
  const totalCreditsUsed = Number(
    selectedPlayers.reduce((acc, p) => acc + p.credits, 0).toFixed(1),
  );

  const entryFee = selectedContest ? selectedContest.entryFeeUVBE : 100;

  const handleJoin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMode(true);
      setTimeout(() => {
        onConfirmJoin();
      }, 1200);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-lg w-full bg-card rounded-3xl border-2 border-black dark:border-white/20 p-5 space-y-4 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#BFFF00] text-black flex items-center justify-center font-black text-xs border border-black shadow-[2px_2px_0_#000]">
              XI
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Confirm Team & Entry</h3>
              <p className="text-[11px] text-muted-foreground">
                {match.teamA.code} vs {match.teamB.code} • {match.series}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMode ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#BFFF00] text-black border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0_#000] animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-foreground">Contest Entered Successfully!</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your Fantasy XI is locked in local demo mode. Good luck on the leaderboard!
            </p>
          </div>
        ) : (
          <>
            {/* Squad Summary Pill */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-bold">Team Name:</span>
                <span className="font-black text-foreground">{teamName}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-bold">Players Selected:</span>
                <span className="font-black font-mono text-foreground">
                  {selectedPlayers.length} / 11 Players
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-bold">Credits Used:</span>
                <span className="font-black font-mono text-foreground">
                  {totalCreditsUsed} / 100 Cr
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                      Captain (2×)
                    </div>
                    <div className="text-xs font-black text-foreground truncate">
                      {captain?.name || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                      Vice Captain (1.5×)
                    </div>
                    <div className="text-xs font-black text-foreground truncate">
                      {viceCaptain?.name || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Entry Fee Box */}
            <div className="p-3.5 rounded-2xl bg-[#BFFF00]/10 border-2 border-black dark:border-[#BFFF00]/40 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase">
                  Contest Entry Fee (Demo)
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-foreground">
                  {entryFee} UVBE
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-black text-[#BFFF00] border border-black">
                {selectedContest?.name || 'Practice / Standard Pool'}
              </span>
            </div>

            {/* Demo Mode Security & Trust Banner */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Demo Mode Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                No real UVBE tokens will be deducted or transferred from your Web3 wallet in this UI
                demonstration phase.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/20 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000] active:scale-95 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Joining...</span>
                ) : (
                  <>
                    <span>Join Contest — {entryFee} UVBE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
