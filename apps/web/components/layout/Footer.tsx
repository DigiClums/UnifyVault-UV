'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/60 dark:bg-[#090d16] py-6 sm:py-8 text-muted-foreground transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">
            Base Mainnet Connected • v2.0.0-rc1
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium">
          <Link
            href="/governance"
            className="inline-flex items-center min-h-[44px] py-2 px-1 hover:text-foreground transition-colors"
          >
            Governance
          </Link>
          <a
            href="https://github.com/DigiClums/UnifyVault-UV"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center min-h-[44px] py-2 px-1 hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/health"
            className="inline-flex items-center min-h-[44px] py-2 px-1 hover:text-foreground transition-colors"
          >
            Protocol Health
          </Link>
        </div>

        <div className="text-[11px] sm:text-xs text-muted-foreground/80">
          © 2026 UnifyVault Protocol. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
