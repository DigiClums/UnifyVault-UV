'use client';

import React, { useState } from 'react';
import { DocsHeader } from './DocsHeader';
import { DocsSidebar } from './DocsSidebar';

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white antialiased">
      <DocsHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Desktop Sticky Sidebar */}
        <div className="hidden md:block w-64 lg:w-72 shrink-0 border-r border-white/10 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
          <DocsSidebar />
        </div>

        {/* Mobile Slideout Drawer */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md pt-16">
            <div className="w-4/5 max-w-sm h-full bg-slate-950 border-r border-white/10 p-4 overflow-y-auto">
              <DocsSidebar onItemClick={() => setIsSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Doc Content Body */}
        <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10 max-w-4xl">{children}</main>
      </div>
    </div>
  );
}
