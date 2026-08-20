'use client';

import React from 'react';
import { AlertTriangle, Loader2, ShieldCheck, X } from 'lucide-react';

export interface GovernanceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionLabel: string;
  actionColor?: 'purple' | 'rose' | 'amber' | 'emerald';
  isPending?: boolean;
  details?: { label: string; value: string | React.ReactNode }[];
  warningMessage?: string;
}

export function GovernanceConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel,
  actionColor = 'purple',
  isPending = false,
  details = [],
  warningMessage,
}: GovernanceConfirmationModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    purple: 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-500/50',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500/50',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500/50',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500/50',
  }[actionColor];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border-subtle p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-subtle/60 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
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
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors disabled:opacity-50"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Grid */}
        {details.length > 0 && (
          <div className="space-y-2 rounded-xl bg-card/60 border border-border-subtle p-3.5 text-xs">
            {details.map((d, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-border-subtle/30 last:border-0 pb-1.5 last:pb-0"
              >
                <span className="text-muted-foreground font-semibold shrink-0">{d.label}</span>
                <span className="font-mono text-foreground font-medium break-all">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warning Alert */}
        {warningMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-200">Governance Preflight Notice</p>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">{warningMessage}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-colors disabled:opacity-50 min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-glow flex items-center space-x-2 min-h-[42px] disabled:opacity-50 ${colorStyles}`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isPending ? 'Confirming Signature...' : actionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
