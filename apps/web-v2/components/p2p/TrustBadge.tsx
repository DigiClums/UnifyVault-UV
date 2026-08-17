'use client';

import React from 'react';
import { useP2PReputation } from '../../hooks/useP2PReputation';
import { TrustTier, ParticipantRole } from '../../lib/contracts/reputation';
import { ShieldCheck, Award, Clock, Star, CheckCircle2 } from 'lucide-react';

interface TrustBadgeProps {
  address: `0x${string}`;
  role?: ParticipantRole; // BUYER or SELLER (defaults to SELLER)
  compact?: boolean;
}

export function TrustBadge({
  address,
  role = ParticipantRole.SELLER,
  compact = false,
}: TrustBadgeProps) {
  const { stats, isLoading } = useP2PReputation(address);

  const tier = role === ParticipantRole.SELLER ? stats.sellerTier : stats.buyerTier;
  const score = role === ParticipantRole.SELLER ? stats.sellerScore : stats.buyerScore;
  const ratingsCount =
    role === ParticipantRole.SELLER ? stats.sellerRatingsCount : stats.buyerRatingsCount;
  const tradesCount =
    role === ParticipantRole.SELLER ? stats.totalTradesAsSeller : stats.totalTradesAsBuyer;

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground animate-pulse">
        <Clock className="w-3 h-3" />
        <span>Loading...</span>
      </span>
    );
  }

  // Tier Display Configurations
  if (tier === TrustTier.VERIFIED_MERCHANT) {
    return (
      <span
        title={`Verified Merchant • ${score.toFixed(1)}% Trust Score (${ratingsCount} ratings, ${tradesCount} trades)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-[1px_1px_0_rgba(245,158,11,0.2)]"
      >
        <Award className="w-3 h-3 text-amber-500" />
        <span>Merchant</span>
        {!compact && <span className="font-bold">({score.toFixed(0)}%)</span>}
      </span>
    );
  }

  if (tier === TrustTier.ESTABLISHED) {
    return (
      <span
        title={`Established Trader • ${score.toFixed(1)}% Trust Score (${ratingsCount} ratings, ${tradesCount} trades)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-[1px_1px_0_rgba(16,185,129,0.2)]"
      >
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span>Established</span>
        {!compact && <span className="font-bold">({score.toFixed(0)}%)</span>}
      </span>
    );
  }

  if (tier === TrustTier.PROBATIONARY) {
    return (
      <span
        title={`Probationary • ${score.toFixed(1)}% Trust Score (${ratingsCount} ratings)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-blue-500/15 text-blue-500 border border-blue-500/30"
      >
        <Star className="w-3 h-3 text-blue-500" />
        <span>
          {ratingsCount} {ratingsCount === 1 ? 'Rating' : 'Ratings'}
        </span>
        {!compact && <span>({score.toFixed(0)}%)</span>}
      </span>
    );
  }

  // UNRATED
  return (
    <span
      title="Unrated Trader • No completed ratings yet"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono bg-muted/60 text-muted-foreground border border-black/10 dark:border-white/10"
    >
      <span>Unrated</span>
    </span>
  );
}
