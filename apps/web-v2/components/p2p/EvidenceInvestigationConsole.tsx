'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  FileWarning,
  Eye,
  ChevronDown,
  ChevronUp,
  Scale,
  ClipboardList,
  MessageSquareQuote,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatUnits } from 'viem';
import type { EscrowTrade } from '../../lib/contracts/escrow';

export type VerificationConclusion =
  'INSUFFICIENT_EVIDENCE' | 'PAYMENT_VERIFIED' | 'PAYMENT_NOT_VERIFIED';

interface EvidenceInvestigationConsoleProps {
  selectedTrade: EscrowTrade;
  isEvidenceHashUsed: boolean;
  isReferenceUsed: boolean;
  onConclusionChange: (conclusion: VerificationConclusion) => void;
  investigationNotes: string;
  onNotesChange: (notes: string) => void;
  onSaveAuditNote?: () => Promise<void>;
  isSavingAudit?: boolean;
}

export function EvidenceInvestigationConsole({
  selectedTrade,
  isEvidenceHashUsed,
  isReferenceUsed,
  onConclusionChange,
  investigationNotes,
  onNotesChange,
  onSaveAuditNote,
  isSavingAudit = false,
}: EvidenceInvestigationConsoleProps) {
  const [activeTab, setActiveTab] = useState<'evidence' | 'matrix' | 'checklist' | 'notes'>(
    'evidence',
  );
  const [evidenceMeta, setEvidenceMeta] = useState<{
    exists: boolean;
    url?: string;
    loading: boolean;
  }>({
    exists: false,
    loading: false,
  });

  const [checklist, setChecklist] = useState({
    utrMatched: false,
    amountMatched: false,
    payerMatched: false,
    payeeMatched: false,
    dateConsistent: false,
    timeConsistent: false,
    statusSuccess: false,
    evidenceInternallyConsistent: false,
    claimsCompared: false,
  });

  const [conclusion, setConclusion] = useState<VerificationConclusion>('INSUFFICIENT_EVIDENCE');

  useEffect(() => {
    let isMounted = true;
    if (
      !selectedTrade.evidenceHash ||
      selectedTrade.evidenceHash ===
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      setEvidenceMeta({ exists: false, loading: false });
      return;
    }
    setEvidenceMeta({ exists: false, loading: true });
    fetch(`/api/p2p/evidence?hash=${selectedTrade.evidenceHash}`, { method: 'HEAD' })
      .then((res) => {
        if (!isMounted) return;
        setEvidenceMeta({
          exists: res.ok,
          loading: false,
          url: res.ok ? `/api/p2p/evidence?hash=${selectedTrade.evidenceHash}` : undefined,
        });
      })
      .catch(() => {
        if (isMounted) setEvidenceMeta({ exists: false, loading: false });
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTrade.evidenceHash]);

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetConclusion = (c: VerificationConclusion) => {
    setConclusion(c);
    onConclusionChange(c);
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="rounded-xl bg-slate-950/60 border border-border-subtle/80 overflow-hidden">
      {/* Compact Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/80 border-b border-border-subtle/60 text-xs">
        <div className="flex items-center space-x-2">
          <Scale className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-white text-xs">Investigation & Evidence Review</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              conclusion === 'PAYMENT_VERIFIED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : conclusion === 'PAYMENT_NOT_VERIFIED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {conclusion}
          </span>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === 'evidence' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            1. Evidence Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === 'matrix' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            2. Comparison
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'checklist' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            <span>3. Checklist</span>
            <span className="text-[10px] bg-slate-900 px-1 rounded font-mono">
              {checkedCount}/9
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === 'notes' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            4. Notes
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-3.5 text-xs">
        {/* Tab 1: Evidence Files */}
        {activeTab === 'evidence' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {/* Buyer Evidence */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-white border-b border-slate-800 pb-1.5 font-sans">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <FileCheck2 className="w-3.5 h-3.5" /> Buyer Proof
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {selectedTrade.buyer.slice(0, 6)}...{selectedTrade.buyer.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Claimed:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedTrade.fiatAmount > 0n
                    ? `${selectedTrade.fiatAmount.toString()} INR`
                    : 'Not Provided'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Receipt File:</span>
                <span>
                  {evidenceMeta.loading ? (
                    <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                    </span>
                  ) : evidenceMeta.exists && evidenceMeta.url ? (
                    <a
                      href={evidenceMeta.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Eye className="w-3 h-3" /> View File
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Committed on-chain</span>
                  )}
                </span>
              </div>
            </div>

            {/* Seller Statement */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-white border-b border-slate-800 pb-1.5 font-sans">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <FileWarning className="w-3.5 h-3.5" /> Seller Claim
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {selectedTrade.seller.slice(0, 6)}...{selectedTrade.seller.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Dispute:</span>
                <span className="text-slate-300">
                  {selectedTrade.disputeInitiator === selectedTrade.seller
                    ? 'Raised by Seller'
                    : 'Raised by Buyer'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Counter-Proof:</span>
                <span className="text-slate-500 text-[10px]">No document submitted</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Comparison Matrix */}
        {activeTab === 'matrix' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1 px-2">Field</th>
                  <th className="py-1 px-2">Buyer</th>
                  <th className="py-1 px-2">Seller</th>
                  <th className="py-1 px-2">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                <tr>
                  <td className="py-1.5 px-2 text-slate-400">Amount</td>
                  <td className="py-1.5 px-2 text-emerald-400 font-bold">
                    {selectedTrade.fiatAmount > 0n
                      ? `${selectedTrade.fiatAmount.toString()} INR`
                      : '--'}
                  </td>
                  <td className="py-1.5 px-2 text-rose-400">Unreceived</td>
                  <td className="py-1.5 px-2 text-amber-400 text-[10px]">DISPUTED</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-400">UTR Ref</td>
                  <td
                    className="py-1.5 px-2 text-purple-300 truncate max-w-[120px]"
                    title={selectedTrade.paymentReference}
                  >
                    {selectedTrade.paymentReference.slice(0, 10)}...
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">No match</td>
                  <td className="py-1.5 px-2 text-slate-400 text-[10px]">CHECK STATEMENT</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-400">Collateral</td>
                  <td className="py-1.5 px-2 text-white font-bold">
                    {formatUnits(selectedTrade.amount, 18)} Locked
                  </td>
                  <td className="py-1.5 px-2 text-white font-bold">
                    {formatUnits(selectedTrade.amount, 18)} Locked
                  </td>
                  <td className="py-1.5 px-2 text-emerald-400 text-[10px]">ESCROWED</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Checklist */}
        {activeTab === 'checklist' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
            {[
              { key: 'utrMatched', label: 'UTR matches receipt' },
              { key: 'amountMatched', label: 'Amount matches trade' },
              { key: 'payerMatched', label: 'Payer matches buyer' },
              { key: 'payeeMatched', label: 'Payee matches seller' },
              { key: 'dateConsistent', label: 'Date consistent' },
              { key: 'timeConsistent', label: 'Timestamp valid' },
              { key: 'statusSuccess', label: 'Payment success' },
              { key: 'evidenceInternallyConsistent', label: 'Consistent proof' },
              { key: 'claimsCompared', label: 'Claims compared' },
            ].map(({ key, label }) => {
              const isChecked = checklist[key as keyof typeof checklist];
              return (
                <label
                  key={key}
                  onClick={() => toggleChecklist(key as keyof typeof checklist)}
                  className={`p-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-purple-950/40 border-purple-500/40 text-white font-semibold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-3 w-3"
                  />
                  <span className="truncate select-none">{label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Tab 4: Investigation Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={investigationNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Record audit reason (e.g. Verified bank statement UTR match)..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
            {onSaveAuditNote && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onSaveAuditNote}
                  disabled={isSavingAudit || !investigationNotes.trim()}
                  className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all disabled:opacity-40"
                >
                  {isSavingAudit && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Note</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compact Mandatory Decision Conclusion Buttons */}
        <div className="pt-2.5 mt-2.5 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-300">
            Set Investigation Ruling Gate:
          </span>
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSetConclusion('PAYMENT_VERIFIED')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                conclusion === 'PAYMENT_VERIFIED'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-glow'
                  : 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800'
              }`}
            >
              ✓ Verified (Buyer)
            </button>
            <button
              type="button"
              onClick={() => handleSetConclusion('PAYMENT_NOT_VERIFIED')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                conclusion === 'PAYMENT_NOT_VERIFIED'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-glow'
                  : 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-800'
              }`}
            >
              ✗ Not Verified (Seller)
            </button>
            <button
              type="button"
              onClick={() => handleSetConclusion('INSUFFICIENT_EVIDENCE')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                conclusion === 'INSUFFICIENT_EVIDENCE'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-glow'
                  : 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
              }`}
            >
              ⚠ Insufficient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
