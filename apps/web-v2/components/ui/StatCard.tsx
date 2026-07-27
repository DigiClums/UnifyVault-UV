'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
  className?: string;
  glowColor?: 'blue' | 'emerald' | 'purple' | 'cyan' | 'amber';
}

export function StatCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  subtitle,
  className,
  glowColor = 'blue',
}: StatCardProps) {
  const glowStyles = {
    blue: 'hover:border-accent-blue/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]',
    emerald: 'hover:border-accent-emerald/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]',
    purple: 'hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]',
    cyan: 'hover:border-accent-cyan/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    amber: 'hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]',
  };

  const iconBgStyles = {
    blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    emerald: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'p-5 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl transition-all duration-300',
        glowStyles[glowColor],
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl border', iconBgStyles[glowColor])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
          {value}
        </div>
      </div>

      {(change || subtitle) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {change && (
            <div
              className={cn(
                'flex items-center space-x-1 font-semibold px-2 py-0.5 rounded-md border',
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{change}</span>
            </div>
          )}
          {subtitle && <span className="text-slate-400 font-medium">{subtitle}</span>}
        </div>
      )}
    </motion.div>
  );
}
