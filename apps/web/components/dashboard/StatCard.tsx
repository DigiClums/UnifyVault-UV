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
      <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-800 mb-3" />
        <div className="h-8 w-36 rounded bg-gray-800 mb-2" />
        <div className="h-3 w-20 rounded bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md hover:border-gray-700 transition-all hover:scale-[1.01]">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {change && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isPositive ? '+' : ''}
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
