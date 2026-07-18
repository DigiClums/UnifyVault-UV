import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PageWrapperProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PageWrapper({ children, className, ...props }: PageWrapperProps) {
  return (
    <main
      className={cn(
        'flex flex-1 flex-col py-6 md:py-10 animate-in fade-in slide-in-from-bottom-2 duration-300',
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}
