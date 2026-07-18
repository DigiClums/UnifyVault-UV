'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { shortenAddress } from '../../lib/utils/formatters';
import { Circle } from 'lucide-react';

export function WalletStatus() {
  const { isConnected, address, connectorName } = useWallet();
  const { isSupported } = useNetwork();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Circle className="w-2.5 h-2.5 fill-muted-foreground/30 stroke-none" />
        <span>Wallet Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Circle
        className={`w-2.5 h-2.5 stroke-none animate-pulse ${
          isSupported ? 'fill-emerald-400' : 'fill-destructive'
        }`}
      />
      <span className="font-semibold text-foreground">{shortenAddress(address)}</span>
      <span>({connectorName})</span>
    </div>
  );
}
