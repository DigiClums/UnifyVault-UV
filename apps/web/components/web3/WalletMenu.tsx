'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { getExplorerLink, shortenAddress } from '../../lib/utils/formatters';
import { LogOut, Copy, ExternalLink } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface WalletMenuProps {
  children: React.ReactNode;
}

export function WalletMenu({ children }: WalletMenuProps) {
  const { disconnect, address, connectorName } = useWallet();
  const { chainId } = useNetwork();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  if (!address) return <>{children}</>;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] bg-card border border-border rounded-xl p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none"
        >
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-border mb-1 select-none">
            <div className="text-xxs font-mono text-muted-foreground uppercase tracking-wider">
              Connected Wallet ({connectorName || 'Web3'})
            </div>
            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
              {shortenAddress(address, 6)}
            </div>
          </div>

          {/* Copy Address */}
          <DropdownMenu.Item
            onClick={handleCopy}
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg cursor-pointer transition-colors focus:outline-none focus:bg-accent"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </span>
          </DropdownMenu.Item>

          {/* View on Explorer */}
          <DropdownMenu.Item asChild>
            <a
              href={getExplorerLink(address, 'address', chainId || 84532)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg cursor-pointer transition-colors focus:outline-none focus:bg-accent"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                <span>View on Explorer</span>
              </span>
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          {/* Disconnect */}
          <DropdownMenu.Item
            onClick={() => disconnect()}
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors focus:outline-none focus:bg-destructive/15"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
