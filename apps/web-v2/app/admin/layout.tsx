'use client';

import React from 'react';
import { AdminAccessGate } from '../../components/admin/AdminAccessGate';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessGate>
      <div className="py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <AdminSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AdminAccessGate>
  );
}
