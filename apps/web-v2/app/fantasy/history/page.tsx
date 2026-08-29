'use client';

import React from 'react';
import Link from 'next/link';
import { FantasyHistoryView } from '../../../components/fantasy/FantasyHistoryView';
import { ArrowLeft } from 'lucide-react';

export default function FantasyHistoryPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/fantasy"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Fantasy Hub</span>
      </Link>

      <FantasyHistoryView />
    </div>
  );
}
