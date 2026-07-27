'use client';

import * as React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/40 p-8 sm:p-12 text-center shadow-sm backdrop-blur-md max-w-lg mx-auto my-6">
      <div className="text-4xl mb-3 block">{icon}</div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
