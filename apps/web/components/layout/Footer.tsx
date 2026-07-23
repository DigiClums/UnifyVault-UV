'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-[#090d16] py-8 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400 font-mono">
            Base Mainnet Connected • v2.0.0-rc1
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/docs" className="hover:text-white transition-colors">
            Documentation
          </Link>
          <a
            href="https://github.com/DigiClums/UnifyVault-UV"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Link href="/health" className="hover:text-white transition-colors">
            Protocol Health
          </Link>
        </div>

        <div className="text-xs text-gray-400">
          © 2026 UnifyVault Protocol. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
