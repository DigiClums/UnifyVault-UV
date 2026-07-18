'use client';

import * as React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNetwork } from '../../hooks/useNetwork';
import { shortenAddress } from '../../lib/utils/formatters';
import { ChevronDown, Wallet, RefreshCw } from 'lucide-react';
import { NetworkBadge } from './NetworkBadge';
import { WalletMenu } from './WalletMenu';
import { ACTIVE_CHAIN } from '../../lib/config/chains';
import Image from 'next/image';

export function WalletButton() {
  const { isSupported, switchChain, switchChainPending } = useNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div
              className="w-32 h-10 rounded-lg bg-secondary animate-pulse"
              role="status"
              aria-label="Loading wallet status"
            />
          );
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Connect Web3 Wallet"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          );
        }

        // Wrong Network guard
        if (!isSupported) {
          return (
            <div className="flex items-center gap-2">
              <NetworkBadge />
              <button
                onClick={() => switchChain(ACTIVE_CHAIN.id)}
                disabled={switchChainPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
                aria-label={`Wrong network. Switch to ${ACTIVE_CHAIN.name}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${switchChainPending ? 'animate-spin' : ''}`} />
                <span>Switch to {ACTIVE_CHAIN.name.replace('Base ', '')}</span>
              </button>
              <WalletMenu>
                <button
                  className="flex items-center justify-center p-1.5 rounded-lg bg-secondary hover:bg-accent border border-border text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Wallet menu options"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </WalletMenu>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-3">
            <NetworkBadge />

            <WalletMenu>
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent border border-border text-sm font-medium text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={`Wallet actions for ${account.ensName || account.address}`}
              >
                {account.ensAvatar ? (
                  <Image
                    src={account.ensAvatar}
                    alt="Wallet Avatar"
                    width={20}
                    height={20}
                    className="rounded-full object-cover border border-border"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-indigo-500 border border-border flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
                    {(account.ensName || account.address).slice(2, 4)}
                  </div>
                )}
                <span>{account.ensName || shortenAddress(account.address)}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </WalletMenu>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
