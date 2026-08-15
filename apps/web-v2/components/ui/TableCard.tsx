'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface TableCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function TableCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: TableCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'p-5 sm:p-6 rounded-xl bg-card border border-border-subtle space-y-4 shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/25 text-[#5f8f00] dark:text-[#BFFF00] shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center space-x-2">{action}</div>}
      </div>

      <div className="overflow-x-auto">{children}</div>
    </motion.div>
  );
}
