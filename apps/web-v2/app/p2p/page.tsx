'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const P2PMeContainer = dynamic(
  () => import('../../components/p2p/P2PMeContainer').then((mod) => mod.P2PMeContainer),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 rounded-2xl bg-background border-2 border-black dark:border-white/10 flex flex-col items-center justify-center gap-3 text-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFFF00]" />
        <p className="text-xs font-bold text-muted-foreground font-mono">
          Loading P2P.me Gateway...
        </p>
      </div>
    ),
  },
);

export default function P2PPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <P2PMeContainer />
    </div>
  );
}
