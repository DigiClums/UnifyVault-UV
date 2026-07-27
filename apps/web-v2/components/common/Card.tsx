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
        'rounded-2xl p-6 transition-all duration-300 border border-border-subtle bg-glass-gradient backdrop-blur-xl',
        glow && 'hover:shadow-glow hover:border-accent-blue/40',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
