'use client';

import * as React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWalletCard() {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 backdrop-blur-md text-center flex flex-col items-center justify-center">
      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg mb-3">
        👛
      </div>
      <h3 className="text-base font-bold text-foreground">Connect Your Wallet</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm">
        Connect a web3 wallet to view your personal share balance, position valuation, and execution
        preview.
      </p>
      <ConnectButton />
    </div>
  );
}
