'use client';

import React, { useState } from 'react';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Loader2,
  ShieldCheck,
  Info,
  Calendar,
  CreditCard,
  Hash,
} from 'lucide-react';
import { verifyPaymentEvidence } from '../../lib/evidence/evidenceVerifier';
import { EvidenceVerificationResult, TradeVerificationContext } from '../../lib/evidence/types';

interface ReceiptUploadWidgetProps {
  context: TradeVerificationContext;
  onEvidenceProcessed: (result: EvidenceVerificationResult, rawUtr: string) => void;
  isSubmitting?: boolean;
}

export function ReceiptUploadWidget({
  context,
  onEvidenceProcessed,
  isSubmitting = false,
}: ReceiptUploadWidgetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EvidenceVerificationResult | null>(null);

  const processVerification = async (selectedFile: File, userUtr: string) => {
    setIsProcessing(true);
    try {
      // Execute REAL receipt OCR pipeline directly on original uploaded bytes (NO synthetic text)
      const res = await verifyPaymentEvidence({
        file: selectedFile,
        context: {
          ...context,
          expectedUtr: userUtr.trim(),
        },
      });

      setResult(res);
      onEvidenceProcessed(res, userUtr.trim());
    } catch (err) {
      console.error('Evidence processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    await processVerification(selectedFile, utrInput);
  };

  const handleUtrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUtrInput(val);
    if (file) {
      processVerification(file, val);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'OCR_SUCCESS':
      case 'MATCH':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'OCR_MISMATCH':
      case 'MISMATCH':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'OCR_FAILED':
      case 'DUPLICATE_REFERENCE':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'OCR_PARTIAL':
      case 'LOW_CONFIDENCE':
      case 'MANUAL_REVIEW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30';
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 bg-card space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2 font-sans">
          <Upload className="w-4 h-4 text-[#BFFF00]" />
          Real UPI Receipt OCR Verification Pipeline
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">
          Allowed: PDF, JPG, JPEG, PNG, WEBP (Max 10MB)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1 font-sans">
            1. Enter 12-Digit Bank UTR / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. 423456789012"
            value={utrInput}
            onChange={handleUtrChange}
            className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background focus:outline-none focus:ring-2 focus:ring-[#BFFF00] min-h-[44px]"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1 font-sans">
            2. Upload Official UPI Payment Receipt
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background min-h-[44px]"
            required
          />
        </div>
      </div>

      {isProcessing && (
        <div className="p-3 rounded-xl bg-accent/40 text-xs font-mono flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-[#BFFF00]" />
          <span>
            Executing optical character recognition & verifying trade parameters on uploaded
            bytes...
          </span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Status Badge */}
          <div
            className={`p-3.5 rounded-xl border-2 ${getStatusBadgeStyle(result.status)} space-y-2`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs">
                {(result.status === 'OCR_SUCCESS' || result.status === 'MATCH') && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {(result.status === 'OCR_MISMATCH' || result.status === 'MISMATCH') && (
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                )}
                {(result.status === 'OCR_FAILED' || result.status === 'DUPLICATE_REFERENCE') && (
                  <AlertTriangle className="w-4 h-4 text-purple-500" />
                )}
                {(result.status === 'OCR_PARTIAL' ||
                  result.status === 'LOW_CONFIDENCE' ||
                  result.status === 'MANUAL_REVIEW') && <Info className="w-4 h-4 text-amber-500" />}
                <span>VERIFICATION STATUS: {result.status}</span>
              </div>
              <span className="text-[10px] font-mono font-bold">
                Confidence: {Math.round(result.extractedData.confidenceScore * 100)}%
              </span>
            </div>

            <p className="text-xs leading-relaxed font-semibold font-sans">
              {result.statusMessage}
            </p>

            {/* OCR Extracted Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 dark:border-white/10 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  OCR Detected UTR:
                </span>
                <span className="font-bold text-foreground truncate block">
                  {result.extractedData.utr || 'Not Found'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  OCR Detected Amount:
                </span>
                <span className="font-bold text-foreground block">
                  {result.extractedData.amount !== undefined
                    ? `₹${result.extractedData.amount.toFixed(2)}`
                    : 'Not Found'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Transaction Date:
                </span>
                <span className="font-bold text-foreground block">
                  {result.extractedData.transactionDate || '—'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Payment Status:
                </span>
                <span className="font-bold text-foreground block">
                  {result.extractedData.paymentStatus || '—'}
                </span>
              </div>
            </div>

            {result.discrepancies.length > 0 && (
              <div className="text-[11px] space-y-1 font-mono pt-1 text-red-600 dark:text-red-400">
                {result.discrepancies.map((d, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="font-black">•</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Hashes & VPS Reference */}
          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-accent/20 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Keccak256 On-Chain Hash:</span>
              <span className="font-bold text-foreground truncate max-w-[240px]">
                {result.fileHash}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>VPS Storage CID:</span>
              <span className="font-bold text-foreground truncate max-w-[240px]">{result.cid}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
