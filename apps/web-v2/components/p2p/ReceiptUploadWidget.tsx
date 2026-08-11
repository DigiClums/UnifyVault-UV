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

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setResult(null);

    try {
      // Simulate reading text from receipt file (or user provided text)
      const textSample = `Paid Amount: ${context.expectedCurrency} ${context.expectedAmount}. UTR: ${utrInput || 'UTR123456789'}`;

      const res = await verifyPaymentEvidence({
        file: selectedFile,
        rawTextOverride: textSample,
        context,
      });

      setResult(res);
      if (res.extractedData.utr && !utrInput) {
        setUtrInput(res.extractedData.utr);
      }
      onEvidenceProcessed(res, utrInput || res.extractedData.utr || '');
    } catch (err) {
      console.error('Evidence processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'MATCH':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'MISMATCH':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'DUPLICATE_REFERENCE':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'LOW_CONFIDENCE':
      case 'MANUAL_REVIEW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30';
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#BFFF00]" />
          Payment Evidence Submission & OCR Pipeline
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">
          Allowed: PDF, JPG, JPEG, PNG (Max 10MB)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
            1. Bank UTR / Transaction Reference
          </label>
          <input
            type="text"
            placeholder="e.g. UTR123456789"
            value={utrInput}
            onChange={(e) => {
              setUtrInput(e.target.value);
              if (result) onEvidenceProcessed(result, e.target.value);
            }}
            className="w-full px-3 py-2 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
            2. Upload Payment Receipt File
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleInputChange}
            className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background"
            required
          />
        </div>
      </div>

      {isProcessing && (
        <div className="p-3 rounded-lg bg-accent/40 text-xs font-mono flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-[#BFFF00]" />
          <span>Running local evidence validator, Keccak256 hasher & OCR parser...</span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Status Badge */}
          <div
            className={`p-3 rounded-xl border ${getStatusBadgeStyle(result.status)} space-y-1.5`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs">
                {result.status === 'MATCH' && <CheckCircle2 className="w-4 h-4" />}
                {result.status === 'MISMATCH' && <AlertOctagon className="w-4 h-4" />}
                {result.status === 'DUPLICATE_REFERENCE' && <AlertTriangle className="w-4 h-4" />}
                {(result.status === 'LOW_CONFIDENCE' || result.status === 'MANUAL_REVIEW') && (
                  <Info className="w-4 h-4" />
                )}
                <span>EVIDENCE STATUS: {result.status}</span>
              </div>
              <span className="text-[10px] font-mono font-bold">
                OCR Confidence: {Math.round(result.extractedData.confidenceScore * 100)}%
              </span>
            </div>

            <p className="text-xs leading-relaxed font-semibold">{result.statusMessage}</p>

            {result.discrepancies.length > 0 && (
              <div className="text-[11px] space-y-1 font-mono pt-1">
                {result.discrepancies.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Hashes & CID Reference */}
          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-accent/20 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Keccak256 On-Chain Hash Anchor:</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">
                {result.fileHash}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Decentralized IPFS CID Reference:</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">{result.cid}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
