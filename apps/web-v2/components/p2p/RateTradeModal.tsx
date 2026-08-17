'use client';

import React, { useState } from 'react';
import { RatingValue } from '../../lib/contracts/reputation';
import { useSubmitTradeRating } from '../../hooks/useP2PReputation';
import { Star, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { keccak256, toHex } from 'viem';

interface RateTradeModalProps {
  isOpen: boolean;
  tradeId: bigint;
  counterpartyAddress: `0x${string}`;
  counterpartyRole: 'Buyer' | 'Seller';
  onClose: () => void;
  onSuccess?: () => void;
}

export function RateTradeModal({
  isOpen,
  tradeId,
  counterpartyAddress,
  counterpartyRole,
  onClose,
  onSuccess,
}: RateTradeModalProps) {
  const [selectedScore, setSelectedScore] = useState<RatingValue>(RatingValue.FIVE_STAR);
  const [hoveredScore, setHoveredScore] = useState<RatingValue | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { submitRating, isPending, isConfirming, isConfirmed, error } = useSubmitTradeRating();

  if (!isOpen) return null;

  const scoreLabels: Record<RatingValue, string> = {
    [RatingValue.NONE]: 'Select Rating',
    [RatingValue.ONE_STAR]: '1 Star - Strongly Negative',
    [RatingValue.TWO_STAR]: '2 Stars - Negative',
    [RatingValue.THREE_STAR]: '3 Stars - Neutral',
    [RatingValue.FOUR_STAR]: '4 Stars - Positive',
    [RatingValue.FIVE_STAR]: '5 Stars - Strongly Positive (Excellent)',
  };

  const activeScore = hoveredScore || selectedScore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedScore === RatingValue.NONE) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      const feedbackHash = reviewText.trim()
        ? keccak256(toHex(reviewText.trim()))
        : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);

      await submitRating(tradeId, selectedScore, feedbackHash);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to submit rating.');
    }
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 font-mono">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending || isConfirming}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-black/10 hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {isConfirmed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black tracking-tight">Rating Submitted!</h3>
            <p className="text-xs text-muted-foreground">
              Your verified rating has been recorded on Base Sepolia. Counterparty trust score
              updated.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider border border-black shadow-[2px_2px_0_#000] hover:translate-y-0.5 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider mb-1">
                <Star className="w-3.5 h-3.5" />
                <span>Rate Trade #{tradeId.toString()}</span>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Rate {counterpartyRole} ({shortAddr(counterpartyAddress)})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your rating contributes to the decentralized on-chain trust score for this trader.
              </p>
            </div>

            {/* Star Rating Selector */}
            <div className="p-4 bg-accent/30 rounded-xl border border-black/10 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedScore(star as RatingValue)}
                    onMouseEnter={() => setHoveredScore(star as RatingValue)}
                    onMouseLeave={() => setHoveredScore(null)}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        star <= activeScore
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-muted-foreground/30 hover:text-muted-foreground/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-foreground">{scoreLabels[activeScore]}</p>
            </div>

            {/* Feedback / Review Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Optional Review Feedback
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="e.g. Fast payment, smooth INR transfer, prompt release..."
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 text-xs bg-background border-2 border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:border-black dark:focus:border-white"
              />
              <span className="text-[10px] text-muted-foreground text-right block">
                {reviewText.length}/200 characters
              </span>
            </div>

            {/* Error Display */}
            {(errorMessage || error) && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage || error?.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || isConfirming}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 font-bold text-xs hover:bg-accent transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider border border-black shadow-[2px_2px_0_#000] hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isConfirming ? 'Confirming...' : 'Signing...'}</span>
                  </>
                ) : (
                  <span>Submit Rating</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
