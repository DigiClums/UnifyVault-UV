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
    blue: 'bg-accent-blue/15 dark:bg-accent-blue/10 text-blue-600 dark:text-accent-blue border-accent-blue/30 dark:border-accent-blue/20',
    emerald:
      'bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-700 dark:text-accent-emerald border-emerald-500/30 dark:border-accent-emerald/20',
    purple:
      'bg-purple-500/15 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20',
    cyan: 'bg-accent-cyan/15 dark:bg-accent-cyan/10 text-cyan-700 dark:text-accent-cyan border-accent-cyan/30 dark:border-accent-cyan/20',
    amber:
      'bg-amber-500/15 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className={cn(
        'p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-xs transition-all duration-200',
        glowStyles[glowColor],
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-2 rounded-xl border shrink-0', iconBgStyles[glowColor])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>

        {(change !== undefined || subtitle !== undefined) && (
          <div className="flex items-center space-x-2 text-xs font-medium pt-0.5">
            {change !== undefined && (
              <span
                className={cn(
                  'flex items-center space-x-0.5 font-bold font-mono px-1.5 py-0.5 rounded text-[11px]',
                  isPositive
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20',
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{change}</span>
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
