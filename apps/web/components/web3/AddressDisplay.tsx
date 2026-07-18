'use client';

import * as React from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { shortenAddress, getExplorerLink } from '../../lib/utils/formatters';
import { useNetwork } from '../../hooks/useNetwork';

interface AddressDisplayProps {
  address?: string;
  chars?: number;
  className?: string;
}

export function AddressDisplay({ address, chars = 4, className }: AddressDisplayProps) {
  const { chainId } = useNetwork();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (address) {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
      }
    },
    [address],
  );

  if (!address) {
    return <span className="text-muted-foreground font-mono text-xs">—</span>;
  }

  return (
    <div className={`flex items-center gap-1.5 font-mono text-xs ${className || ''}`}>
      <span className="text-foreground font-medium" title={address}>
        {shortenAddress(address, chars)}
      </span>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Copy contract address"
        title="Copy address to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in-50 duration-200" />
        ) : (
          <Copy className="w-3.5 h-3.5 transition-transform hover:scale-110 active:scale-95" />
        )}
      </button>
      <a
        href={getExplorerLink(address, 'address', chainId || 84532)}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="View address on explorer"
        title="View on block explorer"
      >
        <ExternalLink className="w-3.5 h-3.5 transition-transform hover:translate-x-0.5 hover:-translate-y-0.5" />
      </a>
    </div>
  );
}
