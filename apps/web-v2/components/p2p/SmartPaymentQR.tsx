'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, ShieldAlert, Copy, Check, Clock, ExternalLink } from 'lucide-react';
import { generateQrSvg } from '../../lib/payment/qrGenerator';
import { PaymentIntent } from '../../lib/payment/types';

interface SmartPaymentQRProps {
  paymentIntent: PaymentIntent;
  upiUri: string;
  onClaimPayment?: (utr: string) => void;
  isClaiming?: boolean;
}

export function SmartPaymentQR({
  paymentIntent,
  upiUri,
  onClaimPayment,
  isClaiming,
}: SmartPaymentQRProps) {
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [utrInput, setUtrInput] = useState('');

  const qrSvgHtml = React.useMemo(() => {
    return generateQrSvg(upiUri, 220);
  }, [upiUri]);

  useEffect(() => {
    if (!paymentIntent.expiresAt) return;
    const expiresMs = new Date(paymentIntent.expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentIntent.expiresAt]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyUpiUri = () => {
    navigator.clipboard.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(paymentIntent.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const isExpired =
    timeLeftSeconds === 0 &&
    paymentIntent.status !== 'PAYMENT_CLAIMED' &&
    paymentIntent.status !== 'WAITING_VERIFICATION';

  return (
    <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-5 space-y-5 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#BFFF00] border border-black shadow-[2px_2px_0_#000] flex items-center justify-center">
            <QrCode className="w-4 h-4 text-black" />
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground tracking-tight font-sans">
              Smart Payment QR (Trade-Bound Intent)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Dynamic trade-specific payee and reference payload
            </p>
          </div>
        </div>

        {/* Expiry Badge */}
        {paymentIntent.expiresAt && (
          <div
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
              isExpired
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isExpired ? 'INTENT EXPIRED' : `Window: ${formatCountdown(timeLeftSeconds)}`}
            </span>
          </div>
        )}
      </div>

      {/* PROMINENT SAFETY / NON-VERIFICATION WARNING BANNER */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1 font-sans">
        <div className="flex items-center gap-2 font-black">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>IMPORTANT PAYMENT INITIATION NOTICE</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Scan with your preferred UPI app (Google Pay, PhonePe, Paytm, BHIM) to pay exact fiat
          amount.
          <strong className="text-foreground font-black ml-1">
            Scanning or claiming payment does NOT automatically equal Payment Verified or Escrow
            Release.
          </strong>
        </p>
      </div>

      {/* QR Code & Pay Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        {/* Left Column: QR SVG Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0_#000] space-y-2">
          <div
            className="w-[200px] h-[200px] flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: qrSvgHtml }}
          />
          <span className="text-[10px] text-black font-bold uppercase tracking-wider">
            UPI Intent QR Code
          </span>
        </div>

        {/* Right Column: Trusted Payee & Trade Intent Details */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Exact Fiat Amount
            </span>
            <p className="text-lg font-black text-foreground">
              {paymentIntent.fiatAmount} {paymentIntent.fiatCurrency}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Trade Reference Note (Required in UPI)
            </span>
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>{paymentIntent.reference}</span>
              <button
                type="button"
                onClick={handleCopyReference}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Copy Reference"
              >
                {copiedRef ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Seller Counterparty Wallet
            </span>
            <p className="font-bold text-muted-foreground">
              {paymentIntent.sellerAddress.slice(0, 8)}...{paymentIntent.sellerAddress.slice(-6)}
            </p>
          </div>

          {/* Copy Raw UPI URI Action */}
          <button
            type="button"
            onClick={handleCopyUpiUri}
            className="w-full py-2.5 px-3 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'UPI Deep Link Copied!' : 'Copy Raw UPI Deep Link'}</span>
          </button>
        </div>
      </div>

      {/* PAYMENT CLAIM SECTION (Buyer Declaration Only — Non-Verifying) */}
      {paymentIntent.status === 'WAITING_VERIFICATION' ||
      paymentIntent.status === 'PAYMENT_CLAIMED' ? (
        <div className="p-4 rounded-xl border-2 border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200 space-y-2 font-sans">
          <div className="flex items-center gap-2 font-black text-sm text-purple-600 dark:text-purple-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>PAYMENT CLAIM SUBMITTED — WAITING FOR VERIFICATION</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your UPI payment claim (UTR:{' '}
            <span className="font-bold font-mono text-foreground">
              {paymentIntent.utrSubmitted || 'Registered'}
            </span>
            ) has been recorded off-chain. State is currently{' '}
            <strong className="text-foreground">WAITING_FOR_VERIFICATION</strong>.
          </p>
        </div>
      ) : (
        onClaimPayment && (
          <div className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 bg-accent/20 space-y-3 font-sans">
            <div className="font-black text-xs uppercase tracking-wider text-foreground">
              Submit Buyer Payment Claim (Declaration)
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter Bank UTR / Tx Reference (e.g. UTR123456789)"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00] min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (utrInput.trim()) onClaimPayment(utrInput.trim());
                }}
                disabled={isClaiming || !utrInput.trim() || isExpired}
                className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px]"
              >
                {isClaiming ? 'Claiming...' : 'I Have Paid via UPI'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
