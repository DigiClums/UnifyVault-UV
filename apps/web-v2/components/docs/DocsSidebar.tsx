'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_DATA } from '../../lib/docs/docsData';
import { BookOpen, Layers, ShieldCheck, Terminal, Zap, ExternalLink } from 'lucide-react';

interface DocsSidebarProps {
  onItemClick?: () => void;
}

export function DocsSidebar({ onItemClick }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full h-full flex flex-col space-y-6 text-sm font-sans py-6 px-4">
      {DOCS_DATA.map((category) => (
        <div key={category.slug} className="space-y-2">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 px-3">
            {category.title}
          </h4>
          <ul className="space-y-1">
            {category.items.map((item) => {
              const itemPath = `/docs/${item.slug}`;
              const isFirst = item.slug === 'introduction';
              const isActive = pathname === itemPath || (isFirst && pathname === '/docs');

              return (
                <li key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    onClick={onItemClick}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#BFFF00] text-black font-bold shadow-[2px_2px_0_#000]'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{item.title}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-black text-[#BFFF00]'
                            : 'bg-[#BFFF00]/15 text-[#BFFF00] border border-[#BFFF00]/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* External Resources */}
      <div className="pt-4 border-t border-white/10 space-y-2">
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 px-3">
          Network & GitHub
        </h4>
        <ul className="space-y-1 text-xs">
          <li>
            <a
              href="https://github.com/DigiClums/UnifyVault-UV"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </li>
          <li>
            <a
              href="https://basescan.org"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <span>BaseScan Contracts</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
