'use client';

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../constants';
import { P2P_REPUTATION_ABI, TrustTier, RatingValue } from '../lib/contracts/reputation';
import { useMemo } from 'react';

export function useP2PReputation(userAddress?: `0x${string}`) {
  const contractAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation;

  // Read Profile
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getProfile',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Read Buyer Trust Score
  const { data: buyerScoreData } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getBuyerTrustScore',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Read Seller Trust Score
  const { data: sellerScoreData } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getSellerTrustScore',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Read Buyer Trust Tier
  const { data: buyerTierData } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getBuyerTrustTier',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Read Seller Trust Tier
  const { data: sellerTierData } = useReadContract({
    address: contractAddress,
    abi: P2P_REPUTATION_ABI,
    functionName: 'getSellerTrustTier',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const parsedStats = useMemo(() => {
    if (!profileData) {
      return {
        buyerScore: Number(buyerScoreData || 0) / 100, // percentage e.g. 92.00%
        sellerScore: Number(sellerScoreData || 0) / 100,
        buyerTier: (buyerTierData ?? TrustTier.UNRATED) as TrustTier,
        sellerTier: (sellerTierData ?? TrustTier.UNRATED) as TrustTier,
        totalTradesAsBuyer: 0,
        totalTradesAsSeller: 0,
        buyerRatingsCount: 0,
        sellerRatingsCount: 0,
        buyerPositive: 0,
        sellerPositive: 0,
      };
    }

    return {
      buyerScore: Number(buyerScoreData || 0) / 100,
      sellerScore: Number(sellerScoreData || 0) / 100,
      buyerTier: (buyerTierData ?? TrustTier.UNRATED) as TrustTier,
      sellerTier: (sellerTierData ?? TrustTier.UNRATED) as TrustTier,
      totalTradesAsBuyer: profileData.totalTradesAsBuyer,
      totalTradesAsSeller: profileData.totalTradesAsSeller,
      buyerRatingsCount: profileData.buyerStats.ratingsCount,
      sellerRatingsCount: profileData.sellerStats.ratingsCount,
      buyerPositive: profileData.buyerStats.positiveCount,
      sellerPositive: profileData.sellerStats.positiveCount,
    };
  }, [profileData, buyerScoreData, sellerScoreData, buyerTierData, sellerTierData]);

  return {
    contractAddress,
    profile: profileData,
    stats: parsedStats,
    isLoading: isProfileLoading,
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
