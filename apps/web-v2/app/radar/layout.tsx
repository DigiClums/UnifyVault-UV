'use client';

import React from 'react';
import { AdminAccessGate } from '../../components/admin/AdminAccessGate';

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessGate>
      <div className="py-4">{children}</div>
    </AdminAccessGate>
  );
}
