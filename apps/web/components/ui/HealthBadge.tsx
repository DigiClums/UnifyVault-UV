'use client';

interface HealthBadgeProps {
  status: 'HEALTHY' | 'REFILL_REQUIRED' | 'RESERVE_SWEEP_REQUIRED' | 'PAUSED';
}

export function HealthBadge({ status }: HealthBadgeProps) {
  const configs = {
    HEALTHY: {
      label: 'Operational Healthy',
      classes:
        'bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20',
      dot: 'bg-emerald-600 dark:bg-emerald-400',
    },
    REFILL_REQUIRED: {
      label: 'Refill Required (<5%)',
      classes:
        'bg-amber-500/15 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20',
      dot: 'bg-amber-600 dark:bg-amber-400',
    },
    RESERVE_SWEEP_REQUIRED: {
      label: 'Reserve Sweep Required (>15%)',
      classes:
        'bg-blue-500/15 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20',
      dot: 'bg-blue-600 dark:bg-blue-400',
    },
    PAUSED: {
      label: 'Protocol Paused',
      classes:
        'bg-rose-500/15 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20',
      dot: 'bg-rose-600 dark:bg-rose-400',
    },
  };

  const config = configs[status] || configs.HEALTHY;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
