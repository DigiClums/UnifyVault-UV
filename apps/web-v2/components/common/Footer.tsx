'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface/30 backdrop-blur-md py-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-accent-blue" />
          <span>
            UnifyVault Protocol V2 &copy; 2026. Production Smart Contracts Audited & Verified.
          </span>
        </div>
        <div className="flex space-x-6">
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Documentation
          </span>
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Contract Explorer
          </span>
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Security Audit
          </span>
        </div>
      </div>
    </footer>
  );
}
