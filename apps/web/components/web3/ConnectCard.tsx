'use client';

import * as React from 'react';
import { Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';

const WalletButton = dynamic(() => import('./WalletButton').then((mod) => mod.WalletButton), {
  ssr: false,
  loading: () => <div className="w-32 h-10 rounded-lg bg-secondary animate-pulse" />,
});

interface ConnectCardProps {
  title?: string;
  description?: string;
}

export function ConnectCard({
  title = 'Connect Your Wallet',
  description = 'Please connect your Web3 wallet to access vault deposit, redemption, and portfolio metrics.',
}: ConnectCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-border bg-card/30 rounded-2xl backdrop-blur-md space-y-5 max-w-sm mx-auto">
      <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-full">
        <Wallet className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <WalletButton />
    </div>
  );
}
