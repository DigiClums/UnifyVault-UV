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
        'p-6 rounded-2xl bg-surface/90 dark:bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-lg shadow-indigo-500/5 dark:shadow-xl overflow-hidden',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/40 pb-4">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-accent-blue/15 dark:bg-accent-blue/10 border border-accent-blue/30 dark:border-accent-blue/20 text-blue-600 dark:text-accent-blue">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center space-x-2">{action}</div>}
      </div>

      <div className="overflow-x-auto">{children}</div>
    </motion.div>
  );
}
