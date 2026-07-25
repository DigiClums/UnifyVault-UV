'use client';

interface TokenCardProps {
  symbol: string;
  name: string;
  weightBps: number;
  balance: string;
  valueUSD: string;
  iconBg: string;
}

export function TokenCard({ symbol, name, weightBps, balance, valueUSD, iconBg }: TokenCardProps) {
  const percentage = (weightBps / 100).toFixed(2);

  return (
    <div className="rounded-xl border border-border bg-muted/40 dark:bg-[#111827]/40 p-4 flex items-center justify-between hover:bg-accent/60 transition-colors shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${iconBg}`}
        >
          {symbol.slice(0, 2)}
        </div>
        <div>
          <h4 className="font-bold text-foreground text-base">{symbol}</h4>
          <span className="text-xs text-muted-foreground">
            {name} • Target {percentage}%
          </span>
        </div>
      </div>

      <div className="text-right">
        <span className="block font-mono font-bold text-foreground text-base">{balance}</span>
        <span className="block text-xs text-muted-foreground">{valueUSD}</span>
      </div>
    </div>
  );
}
