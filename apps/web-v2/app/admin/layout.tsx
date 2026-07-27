'use client';

import React from 'react';
import { AdminAccessGate } from '../../components/admin/AdminAccessGate';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Info } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessGate>
      <div className="py-6 space-y-6">
        {/* Task 3: Subtle Amber Administrator Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-3 backdrop-blur-md">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <Info className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="font-bold text-amber-200">Administrator Console: </span>
            <span className="text-amber-300/90 leading-relaxed">
              Actions performed from this interface affect live protocol state and require
              authorized governance permissions.
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <AdminSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AdminAccessGate>
  );
}
