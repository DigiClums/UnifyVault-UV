import React from 'react';
import { cn } from '../../lib/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className, glow = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-200 border-2 border-black dark:border-white/15 bg-glass-gradient shadow-glass',
        'hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(0,0,0,0.9)] dark:hover:shadow-[6px_6px_0_rgba(0,0,0,0.95)]',
        glow && 'hover:border-[#BFFF00] dark:hover:border-[#BFFF00]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
