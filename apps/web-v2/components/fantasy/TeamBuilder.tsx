'use client';

import React, { useState, useMemo } from 'react';
import { Match, Player, PlayerRole } from '../../lib/fantasy/types';
import { validateFantasyTeam, DEFAULT_FANTASY_RULES } from '../../lib/fantasy/rules';
import { CricketGroundView } from './CricketGroundView';
import {
  Users,
  Shield,
  Crown,
  Check,
  AlertCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

interface TeamBuilderProps {
  match: Match;
  existingTeamId?: string;
  initialSelectedPlayerIds?: string[];
  initialCaptainId?: string;
  initialViceCaptainId?: string;
  onProceedToConfirmation: (
    selectedPlayers: Player[],
    captainId: string,
    viceCaptainId: string,
    teamName: string,
  ) => void;
}

export function TeamBuilder({
  match,
  existingTeamId,
  initialSelectedPlayerIds = [],
  initialCaptainId = '',
  initialViceCaptainId = '',
  onProceedToConfirmation,
}: TeamBuilderProps) {
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(() => {
    if (initialSelectedPlayerIds.length > 0) {
      return match.players.filter((p) => initialSelectedPlayerIds.includes(p.id));
    }
    return [];
  });
  const [captainId, setCaptainId] = useState<string | null>(initialCaptainId || null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(initialViceCaptainId || null);
  const [teamName, setTeamName] = useState<string>('My UV Champions');
  const [activeStep, setActiveStep] = useState<'pick' | 'roles' | 'preview'>('pick');
  const [showGroundModal, setShowGroundModal] = useState<boolean>(false);

  // Validation
  const validation = useMemo(() => {
    return validateFantasyTeam(
      selectedPlayers,
      captainId,
      viceCaptainId,
      match.teamA.id,
      match.teamB.id,
      DEFAULT_FANTASY_RULES,
    );
  }, [selectedPlayers, captainId, viceCaptainId, match.teamA.id, match.teamB.id]);

  const teamACount = selectedPlayers.filter((p) => p.teamId === match.teamA.id).length;
  const teamBCount = selectedPlayers.filter((p) => p.teamId === match.teamB.id).length;
  const totalCredits = Number(selectedPlayers.reduce((acc, p) => acc + p.credits, 0).toFixed(1));
  const remainingCredits = Number((100 - totalCredits).toFixed(1));

  const filteredPlayers = useMemo(() => {
    if (selectedRole === 'ALL') return match.players;
    return match.players.filter((p) => p.role === selectedRole);
  }, [match.players, selectedRole]);

  const togglePlayer = (player: Player) => {
    const isSelected = selectedPlayers.some((p) => p.id === player.id);
    if (isSelected) {
      setSelectedPlayers((prev) => prev.filter((p) => p.id !== player.id));
      if (captainId === player.id) setCaptainId(null);
      if (viceCaptainId === player.id) setViceCaptainId(null);
    } else {
      if (selectedPlayers.length >= 11) {
        return; // Max 11 players
      }
      setSelectedPlayers((prev) => [...prev, player]);
    }
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (captainId === playerId) setCaptainId(null);
    if (viceCaptainId === playerId) setViceCaptainId(null);
  };

  const handleNextStep = () => {
    if (activeStep === 'pick') {
      if (selectedPlayers.length === 11) {
        setActiveStep('roles');
      }
    } else if (activeStep === 'roles') {
      if (validation.isValid && captainId && viceCaptainId) {
        onProceedToConfirmation(selectedPlayers, captainId, viceCaptainId, teamName);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Match Info & Progress Tracker ── */}
      <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 shadow-[4px_4px_0_#000] dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">{match.teamA.flag}</span>
              <span className="text-sm sm:text-base font-black text-foreground">
                {match.teamA.code} vs {match.teamB.code}
              </span>
              <span className="text-xl sm:text-2xl">{match.teamB.flag}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-muted-foreground border border-black/10 dark:border-white/10">
                {match.format}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Max 7 players from one team • Max 100 Credits Budget
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGroundModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-card-hover border-2 border-black dark:border-white/20 text-xs font-bold shadow-[2px_2px_0_#000] dark:shadow-none transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>Ground View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPlayers([]);
                setCaptainId(null);
                setViceCaptainId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
              title="Reset squad"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* ── Selection Counters Dashboard ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Players</div>
            <div className="text-base sm:text-lg font-black font-mono text-foreground">
              <span
                className={
                  selectedPlayers.length === 11 ? 'text-[#5f8f00] dark:text-[#BFFF00]' : ''
                }
              >
                {selectedPlayers.length}
              </span>
              <span className="text-xs text-muted-foreground">/11</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">
              Credits Left
            </div>
            <div
              className={`text-base sm:text-lg font-black font-mono ${
                remainingCredits < 0 ? 'text-rose-600' : 'text-foreground'
              }`}
            >
              {remainingCredits}
              <span className="text-xs text-muted-foreground font-sans">/100</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">
              {match.teamA.code}
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
              {teamACount}
              <span className="text-xs text-muted-foreground">/7</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-black/50 border border-black/10 dark:border-white/10 text-center">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">
              {match.teamB.code}
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {teamBCount}
              <span className="text-xs text-muted-foreground">/7</span>
            </div>
          </div>
        </div>

        {/* ── Role Count Pills Indicator ── */}
        <div className="flex items-center justify-between gap-1 pt-3 text-[11px] font-bold text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-black/5">
              WK: {validation.roleCounts.WK} (min 1)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-black/5">
              BAT: {validation.roleCounts.BAT} (min 3)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-black/5">
              AR: {validation.roleCounts.AR} (min 1)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-black/5">
              BOWL: {validation.roleCounts.BOWL} (min 3)
            </span>
          </div>

          {selectedPlayers.length === 11 && (
            <div className="text-[11px] font-black text-[#5f8f00] dark:text-[#BFFF00] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              11 Selected
            </div>
          )}
        </div>
      </div>

      {/* ── Step Switcher (Pick XI vs C/VC Selection) ── */}
      <div className="flex items-center gap-2 bg-slate-200 dark:bg-black/70 p-1 rounded-2xl border-2 border-black dark:border-white/15 shadow-[2px_2px_0_#000]">
        <button
          type="button"
          onClick={() => setActiveStep('pick')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 'pick'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>1. Select Playing XI ({selectedPlayers.length}/11)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedPlayers.length === 11) {
              setActiveStep('roles');
            }
          }}
          disabled={selectedPlayers.length !== 11}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 'roles'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : selectedPlayers.length === 11
                ? 'text-foreground hover:bg-slate-300 dark:hover:bg-white/10'
                : 'text-muted-foreground opacity-40 cursor-not-allowed'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>2. Choose C & VC</span>
        </button>
      </div>

      {/* ── STEP 1: PLAYER LIST & FILTERING ── */}
      {activeStep === 'pick' && (
        <div className="space-y-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            {(['ALL', 'WK', 'BAT', 'AR', 'BOWL'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                  selectedRole === role
                    ? 'bg-black text-[#BFFF00] dark:bg-white dark:text-black border-black shadow-[2px_2px_0_#000]'
                    : 'bg-card text-muted-foreground hover:text-foreground border-black/10 dark:border-white/15'
                }`}
              >
                {role === 'ALL' ? 'ALL PLAYERS' : role}
                {role !== 'ALL' && (
                  <span className="ml-1 opacity-70 text-[10px]">
                    ({match.players.filter((p) => p.role === role).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Player Cards Table / Grid */}
          <div className="space-y-2">
            {filteredPlayers.map((player) => {
              const isSelected = selectedPlayers.some((p) => p.id === player.id);
              const isCap = player.id === captainId;
              const isVC = player.id === viceCaptainId;
              const wouldExceedTeamLimit =
                !isSelected &&
                ((player.teamId === match.teamA.id && teamACount >= 7) ||
                  (player.teamId === match.teamB.id && teamBCount >= 7));
              const wouldExceedBudget = !isSelected && totalCredits + player.credits > 100;
              const isSquadFull = !isSelected && selectedPlayers.length >= 11;
              const isDisabled = wouldExceedTeamLimit || wouldExceedBudget || isSquadFull;

              return (
                <div
                  key={player.id}
                  onClick={() => !isDisabled && togglePlayer(player)}
                  className={`rounded-2xl border-2 p-3 sm:p-4 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-black dark:border-[#BFFF00] bg-[#BFFF00]/10 dark:bg-[#BFFF00]/5 shadow-[3px_3px_0_#000]'
                      : isDisabled
                        ? 'border-black/10 dark:border-white/5 bg-slate-100 dark:bg-black/30 opacity-50 cursor-not-allowed'
                        : 'border-black/20 dark:border-white/15 bg-card hover:border-black dark:hover:border-white/40 shadow-sm'
                  }`}
                >
                  {/* Player Basic Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                        player.teamCode === 'IND'
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-amber-500 border-amber-300 text-black'
                      }`}
                    >
                      {player.teamCode}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-foreground truncate">
                          {player.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-muted-foreground uppercase">
                          {player.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>Avg: {player.stats.averagePoints} pts</span>
                        <span>•</span>
                        <span>Sel by {player.stats.selectionRate}%</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          Form: {player.stats.recentPoints.slice(0, 3).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Credits & Selection Status */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black font-mono text-foreground">
                        {player.credits}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase font-bold">
                        Credits
                      </div>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isSelected
                          ? 'bg-[#BFFF00] border-black text-black shadow-[1px_1px_0_#000]'
                          : 'border-black/30 dark:border-white/20 text-transparent'
                      }`}
                    >
                      <Check className={`w-4 h-4 ${isSelected ? 'stroke-[3]' : ''}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: CAPTAIN & VICE-CAPTAIN SELECTION ── */}
      {activeStep === 'roles' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              <strong>Captain gets 2× points</strong>, and{' '}
              <strong>Vice-Captain gets 1.5× points</strong>. Choose wisely to maximize fantasy
              leaderboard rank.
            </span>
          </div>

          <div className="space-y-2">
            {selectedPlayers.map((player) => {
              const isCap = player.id === captainId;
              const isVC = player.id === viceCaptainId;

              return (
                <div
                  key={player.id}
                  className="rounded-2xl border-2 border-black/20 dark:border-white/15 bg-card p-3 sm:p-4 flex items-center justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                        player.teamCode === 'IND'
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-amber-500 border-amber-300 text-black'
                      }`}
                    >
                      {player.teamCode}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-foreground truncate">
                        {player.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {player.role} • {player.credits} Cr • Avg {player.stats.averagePoints} pts
                      </div>
                    </div>
                  </div>

                  {/* C and VC Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Captain Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCap) {
                          setCaptainId(null);
                        } else {
                          setCaptainId(player.id);
                          if (viceCaptainId === player.id) setViceCaptainId(null);
                        }
                      }}
                      className={`w-10 h-10 rounded-xl font-black text-xs border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isCap
                          ? 'bg-amber-400 border-black text-black shadow-[2px_2px_0_#000] scale-105'
                          : 'bg-card border-black/20 dark:border-white/20 text-muted-foreground hover:border-black'
                      }`}
                    >
                      <span>C</span>
                      <span className="text-[8px] font-mono leading-none">2x</span>
                    </button>

                    {/* Vice Captain Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isVC) {
                          setViceCaptainId(null);
                        } else {
                          setViceCaptainId(player.id);
                          if (captainId === player.id) setCaptainId(null);
                        }
                      }}
                      className={`w-10 h-10 rounded-xl font-black text-xs border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isVC
                          ? 'bg-slate-200 dark:bg-white border-black text-black shadow-[2px_2px_0_#000] scale-105'
                          : 'bg-card border-black/20 dark:border-white/20 text-muted-foreground hover:border-black'
                      }`}
                    >
                      <span>VC</span>
                      <span className="text-[8px] font-mono leading-none">1.5x</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Validation Errors Banner ── */}
      {validation.errors.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Squad Requirements:
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Bottom Action Toolbar (Fixed / Sticky for mobile) ── */}
      <div className="sticky bottom-16 xl:bottom-4 z-30 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border-2 border-black dark:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowGroundModal(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-foreground text-xs font-bold border border-black/10 dark:border-white/10"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ground View</span>
        </button>

        {activeStep === 'pick' ? (
          <button
            type="button"
            onClick={handleNextStep}
            disabled={selectedPlayers.length !== 11}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs border-2 border-black transition-all ${
              selectedPlayers.length === 11
                ? 'bg-[#BFFF00] hover:bg-[#d0ff66] text-black shadow-[3px_3px_0_#000] active:scale-95 cursor-pointer'
                : 'bg-slate-200 dark:bg-white/10 text-muted-foreground opacity-50 cursor-not-allowed'
            }`}
          >
            <span>Continue ({selectedPlayers.length}/11)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!validation.isValid || !captainId || !viceCaptainId}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs border-2 border-black transition-all ${
              validation.isValid && captainId && viceCaptainId
                ? 'bg-[#BFFF00] hover:bg-[#d0ff66] text-black shadow-[3px_3px_0_#000] active:scale-95 cursor-pointer'
                : 'bg-slate-200 dark:bg-white/10 text-muted-foreground opacity-50 cursor-not-allowed'
            }`}
          >
            <span>Confirm Fantasy XI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Ground View Modal ── */}
      {showGroundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-xl w-full bg-card rounded-3xl border-2 border-black dark:border-white/20 p-4 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-foreground">
                Ground Formation ({selectedPlayers.length}/11)
              </h3>
              <button
                type="button"
                onClick={() => setShowGroundModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <CricketGroundView
              players={selectedPlayers}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              onRemovePlayer={removePlayer}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowGroundModal(false)}
                className="px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
