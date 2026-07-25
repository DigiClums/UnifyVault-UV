'use client';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  loading?: boolean;
  subtitle?: string;
}

export function StatCard({ title, value, change, isPositive, loading, subtitle }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-4 w-24 rounded bg-muted mb-3" />
        <div className="h-8 w-36 rounded bg-muted mb-2" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md hover:border-primary/40 transition-all duration-200 hover:scale-[1.01] shadow-sm dark:shadow-none">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-foreground tracking-tight">{value}</span>
        {change && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {isPositive ? '+' : ''}
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
