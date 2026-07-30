'use client';

import React from 'react';
import Link from 'next/link';
import { useDashboard } from '../../hooks/useDashboard';
import { PortfolioAnalyticsCard } from '../../components/dashboard/PortfolioAnalyticsCard';
import { HoldingsTable } from '../../components/portfolio/HoldingsTable';
import { Briefcase, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function PortfolioPage() {
  const metrics = useDashboard();

  return (
    <div className="py-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Briefcase className="w-6 h-6 text-accent-blue" />
              <span>Personal Portfolio & Custody</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time personal index holdings, share valuation, and custodied strategy asset
            inventory.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/deposit"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-accent-blue hover:bg-blue-600 text-xs font-bold text-white shadow-glow transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Deposit</span>
          </Link>
          <Link
            href="/redeem"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4 text-purple-400" />
            <span>Redeem</span>
          </Link>
        </div>
      </div>

      {/* 1. Personal Holdings & Performance Card */}
      <section className="space-y-4">
        <PortfolioAnalyticsCard metrics={metrics} />
      </section>

      {/* 2. Custodied Asset Inventory Table */}
      <section className="space-y-4">
        <HoldingsTable />
      </section>
    </div>
  );
}
