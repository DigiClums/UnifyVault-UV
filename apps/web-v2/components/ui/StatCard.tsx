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
    blue: 'hover:border-[#BFFF00]/40 hover:shadow-[0_0_20px_rgba(191,255,0,0.15)]',
    emerald: 'hover:border-[#BFFF00]/40 hover:shadow-[0_0_20px_rgba(191,255,0,0.15)]',
    purple: 'hover:border-[#BFFF00]/40 hover:shadow-[0_0_20px_rgba(191,255,0,0.15)]',
    cyan: 'hover:border-[#BFFF00]/40 hover:shadow-[0_0_20px_rgba(191,255,0,0.15)]',
    amber: 'hover:border-[#BFFF00]/40 hover:shadow-[0_0_20px_rgba(191,255,0,0.15)]',
  };

  const iconBgStyles = {
    blue: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
    emerald: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
    purple: 'bg-card text-foreground border-border-subtle',
    cyan: 'bg-card text-muted-foreground border-border-subtle',
    amber: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className={cn(
        'p-5 rounded-xl bg-card border border-border-subtle shadow-xs transition-all duration-200',
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

      <div className="mt-3 space-y-1 min-w-0">
        <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight truncate">
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
