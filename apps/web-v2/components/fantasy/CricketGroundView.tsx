'use client';

import React from 'react';
import { Player, PlayerRole } from '../../lib/fantasy/types';
import { X, Crown, Shield, Shirt } from 'lucide-react';

interface CricketGroundViewProps {
  players: Player[];
  captainId: string | null;
  viceCaptainId: string | null;
  onRemovePlayer?: (playerId: string) => void;
  onSelectCaptain?: (playerId: string) => void;
  onSelectViceCaptain?: (playerId: string) => void;
  compact?: boolean;
}

export function CricketGroundView({
  players,
  captainId,
  viceCaptainId,
  onRemovePlayer,
  onSelectCaptain,
  onSelectViceCaptain,
  compact = false,
}: CricketGroundViewProps) {
  const wkPlayers = players.filter((p) => p.role === 'WK');
  const batPlayers = players.filter((p) => p.role === 'BAT');
  const arPlayers = players.filter((p) => p.role === 'AR');
  const bowlPlayers = players.filter((p) => p.role === 'BOWL');

  const renderPlayerBadge = (player: Player) => {
    const isCap = player.id === captainId;
    const isVC = player.id === viceCaptainId;

    return (
      <div
        key={player.id}
        className="flex flex-col items-center relative group select-none transition-transform duration-150 hover:scale-105"
      >
        {/* Remove button if enabled */}
        {onRemovePlayer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemovePlayer(player.id);
            }}
            className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow-sm hover:bg-rose-700 cursor-pointer"
            title="Remove player"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Player Jersey / Icon Avatar */}
        <div className="relative">
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.7)] border-2 ${
              player.teamCode === 'IND'
                ? 'bg-blue-600 border-blue-300 text-white'
                : player.teamCode === 'AUS'
                  ? 'bg-amber-500 border-amber-200 text-black'
                  : 'bg-emerald-600 border-emerald-300 text-white'
            }`}
          >
            <span className="font-black text-[11px] sm:text-xs tracking-wider">
              {player.teamCode}
            </span>
          </div>

          {/* Captain / Vice Captain Badges */}
          {isCap && (
            <div className="absolute -top-2 -left-2 bg-amber-400 text-black font-black text-[9px] px-1 py-0.5 rounded-full border border-black shadow-[1px_1px_0_#000] flex items-center gap-0.5 z-10">
              <Crown className="w-2.5 h-2.5" />
              <span>2x</span>
            </div>
          )}
          {isVC && (
            <div className="absolute -top-2 -left-2 bg-slate-200 text-black font-black text-[9px] px-1 py-0.5 rounded-full border border-black shadow-[1px_1px_0_#000] flex items-center gap-0.5 z-10">
              <Shield className="w-2.5 h-2.5" />
              <span>1.5x</span>
            </div>
          )}
        </div>

        {/* Name Banner */}
        <div className="mt-1 px-2 py-0.5 rounded-md bg-black/85 text-white text-[10px] font-bold tracking-tight text-center max-w-[80px] sm:max-w-[90px] truncate shadow-sm border border-white/20">
          {player.shortName}
        </div>

        {/* Credit & Points Pill */}
        <div className="text-[9px] font-mono text-white/90 bg-black/60 px-1 rounded mt-0.5">
          {player.credits} Cr
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-3xl border-2 border-black dark:border-white/15 overflow-hidden shadow-[4px_4px_0_#000] dark:shadow-none bg-gradient-to-b from-[#14532d] via-[#166534] to-[#14532d] p-3 sm:p-5 relative">
      {/* Ground markings & pitch visual */}
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 border-2 border-white/20 rounded-full pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-36 bg-[#854d0e]/25 border border-amber-300/20 rounded-md pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 space-y-4 sm:space-y-6">
        {/* Row 1: Wicket Keepers */}
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90 mb-1.5 drop-shadow-sm">
            Wicket-Keepers ({wkPlayers.length})
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap min-h-[56px]">
            {wkPlayers.length > 0 ? (
              wkPlayers.map(renderPlayerBadge)
            ) : (
              <div className="text-[11px] text-white/60 font-semibold italic">
                Select 1 - 4 Wicket-Keeper
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Batsmen */}
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90 mb-1.5 drop-shadow-sm">
            Batsmen ({batPlayers.length})
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap min-h-[56px]">
            {batPlayers.length > 0 ? (
              batPlayers.map(renderPlayerBadge)
            ) : (
              <div className="text-[11px] text-white/60 font-semibold italic">
                Select 3 - 6 Batsmen
              </div>
            )}
          </div>
        </div>

        {/* Row 3: All-Rounders */}
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90 mb-1.5 drop-shadow-sm">
            All-Rounders ({arPlayers.length})
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap min-h-[56px]">
            {arPlayers.length > 0 ? (
              arPlayers.map(renderPlayerBadge)
            ) : (
              <div className="text-[11px] text-white/60 font-semibold italic">
                Select 1 - 4 All-Rounders
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Bowlers */}
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90 mb-1.5 drop-shadow-sm">
            Bowlers ({bowlPlayers.length})
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap min-h-[56px]">
            {bowlPlayers.length > 0 ? (
              bowlPlayers.map(renderPlayerBadge)
            ) : (
              <div className="text-[11px] text-white/60 font-semibold italic">
                Select 3 - 6 Bowlers
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
