'use client';

import React from 'react';
import { ContestTier } from '../../lib/fantasy/types';
import { Trophy, Award, X } from 'lucide-react';

interface PrizeBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: ContestTier | null;
}

export function PrizeBreakdownModal({ isOpen, onClose, contest }: PrizeBreakdownModalProps) {
  if (!isOpen || !contest) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-md w-full bg-card rounded-3xl border-2 border-black dark:border-white/20 p-5 space-y-4 shadow-2xl relative my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#BFFF00] text-black flex items-center justify-center font-black text-xs border border-black shadow-[2px_2px_0_#000]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Prize Distribution</h3>
              <p className="text-[11px] text-muted-foreground">{contest.name}</p>
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

        {/* Prize Pool Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-black/40 border border-black/10 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Total Prize Pool
            </div>
            <div className="text-base font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              {contest.totalPrizePoolUVBE.toLocaleString('en-US')} UVBE
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Winners Share
            </div>
            <div className="text-base font-black font-mono text-foreground">
              {contest.winnerPercentage}% of field
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {contest.prizeBreakdown.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-black/10 dark:border-white/10 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center font-mono font-bold text-[10px]">
                  #{index + 1}
                </span>
                <span className="font-bold text-foreground">{item.rankRange}</span>
              </div>

              <div className="text-right">
                <span className="font-mono font-black text-[#5f8f00] dark:text-[#BFFF00]">
                  {item.prizeUVBE.toLocaleString('en-US')} UVBE
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000]"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
