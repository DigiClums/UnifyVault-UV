'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, Loader2, X } from 'lucide-react';

export interface StrategyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title: string;
  description: string;
  actionLabel?: string;
  actionColor?: 'purple' | 'blue' | 'rose' | 'amber' | 'emerald';
  warningMessage?: string;
  details: { label: string; value: React.ReactNode }[];
}

export function StrategyConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
  actionLabel = 'Confirm Allocation Change',
  actionColor = 'purple',
  warningMessage,
  details,
}: StrategyConfirmationModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    purple: 'bg-purple-600 hover:bg-purple-500 text-white shadow-glow',
    blue: 'bg-accent-blue hover:bg-accent-blue/80 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-surface/95 border border-border-subtle p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border-subtle/60 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        {warningMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{warningMessage}</span>
          </div>
        )}

        {/* Parameters Verification */}
        <div className="rounded-xl bg-card/60 border border-border-subtle p-3.5 space-y-2 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border-subtle/40 pb-1.5">
            Pre-flight Parameter Verification
          </span>
          <div className="space-y-1.5">
            {details.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">{item.label}:</span>
                <span className="font-mono text-foreground text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-colors disabled:opacity-50 min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 min-h-[40px] ${colorStyles[actionColor]}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Awaiting Wallet Signature...</span>
              </>
            ) : (
              <span>{actionLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
