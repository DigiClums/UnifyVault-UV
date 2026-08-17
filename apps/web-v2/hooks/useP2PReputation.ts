'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { DEPLOYED_CONTRACTS_SEPOLIA, isNonZeroAddress } from '../constants';
import {
  P2P_REPUTATION_ABI,
  TrustTier,
  RatingValue,
  calculateTrustScoreBps,
  computeTrustTier,
  type UserReputationProfile,
} from '../lib/contracts/reputation';
import { useMemo } from 'react';

export function useP2PReputation(userAddress?: `0x${string}`) {
  const contractAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation;
  const isAddressValid = Boolean(userAddress && isNonZeroAddress(userAddress));

  // Single authoritative contract read for the full user reputation profile.
  // Utilizes TanStack Query caching (60s staleTime) to prevent duplicate RPC calls.
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError,
    error,
    refetch: refetchProfile,
  } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getProfile',
    args: isAddressValid && userAddress ? [userAddress] : undefined,
    query: {
      enabled: isAddressValid,
      staleTime: 60_000, // 60 seconds TanStack Query cache
      gcTime: 300_000, // 5 minutes cache persistence
    },
  });

  // Mathematically identical local derivation of trust scores and tiers
  // Eliminates 4 redundant JSON-RPC calls per address with 0 precision loss.
  const parsedStats = useMemo(() => {
    if (!profileData) {
      return {
        buyerScore: 0,
        sellerScore: 0,
        buyerScoreBps: 0,
        sellerScoreBps: 0,
        buyerTier: TrustTier.UNRATED,
        sellerTier: TrustTier.UNRATED,
        totalTradesAsBuyer: 0,
        totalTradesAsSeller: 0,
        buyerRatingsCount: 0,
        sellerRatingsCount: 0,
        buyerPositive: 0,
        sellerPositive: 0,
      };
    }

    const typedProfile = profileData as UserReputationProfile;

    // Buyer math (matches P2PReputation.sol calculateTrustScore & computeTier)
    const buyerRatingsCount = Number(typedProfile.buyerStats.ratingsCount);
    const buyerScoreSum = typedProfile.buyerStats.scoreSum;
    const buyerVolume = typedProfile.buyerStats.volumeSettled;
    const buyerScoreBps = calculateTrustScoreBps(buyerRatingsCount, buyerScoreSum);
    const buyerTier = computeTrustTier(buyerRatingsCount, buyerScoreBps, buyerVolume);

    // Seller math (matches P2PReputation.sol calculateTrustScore & computeTier)
    const sellerRatingsCount = Number(typedProfile.sellerStats.ratingsCount);
    const sellerScoreSum = typedProfile.sellerStats.scoreSum;
    const sellerVolume = typedProfile.sellerStats.volumeSettled;
    const sellerScoreBps = calculateTrustScoreBps(sellerRatingsCount, sellerScoreSum);
    const sellerTier = computeTrustTier(sellerRatingsCount, sellerScoreBps, sellerVolume);

    return {
      buyerScore: buyerScoreBps / 100, // percentage e.g. 92.00%
      sellerScore: sellerScoreBps / 100,
      buyerScoreBps,
      sellerScoreBps,
      buyerTier,
      sellerTier,
      totalTradesAsBuyer: Number(typedProfile.totalTradesAsBuyer),
      totalTradesAsSeller: Number(typedProfile.totalTradesAsSeller),
      buyerRatingsCount,
      sellerRatingsCount,
      buyerPositive: Number(typedProfile.buyerStats.positiveCount),
      sellerPositive: Number(typedProfile.sellerStats.positiveCount),
    };
  }, [profileData]);

  return {
    contractAddress,
    profile: profileData,
    stats: parsedStats,
    isLoading: isProfileLoading,
    isError,
    error,
    refetch: refetchProfile,
  };
}

export function useSubmitTradeRating() {
  const contractAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation;
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const submitRating = async (
    tradeId: bigint,
    score: RatingValue,
    feedbackHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000',
  ) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: P2P_REPUTATION_ABI,
      functionName: 'submitRating',
      args: [tradeId, score, feedbackHash],
    });
  };

  return {
    submitRating,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
