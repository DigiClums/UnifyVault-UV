'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Wrench,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  ExternalLink,
} from 'lucide-react';

export interface ModuleMaintenanceConfig {
  enabled: boolean;
  title?: string;
  message?: string;
  estimatedEndTime?: string;
}

export interface MaintenanceConfig {
  enabled: boolean; // Global maintenance (entire app)
  title?: string;
  message?: string;
  estimatedEndTime?: string;
  telegramUrl?: string;
  modules?: {
    staking?: ModuleMaintenanceConfig;
    p2p?: ModuleMaintenanceConfig;
    deposit?: ModuleMaintenanceConfig;
    redeem?: ModuleMaintenanceConfig;
    transfer?: ModuleMaintenanceConfig;
    options?: ModuleMaintenanceConfig;
    fantasy?: ModuleMaintenanceConfig;
  };
}

const GITHUB_BACKUP_URL =
  'https://raw.githubusercontent.com/DigiClums/UnifyVault-UV/main/apps/web-v2/public/version.json';

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<MaintenanceConfig | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkMaintenance = async () => {
    try {
      setIsChecking(true);
      // 1. Try local instant API first
      let res = await fetch(`/api/maintenance?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      // 2. Fallback to GitHub raw if local endpoint not reachable
      if (!res.ok) {
        res = await fetch(`${GITHUB_BACKUP_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.maintenance) {
          setMaintenance(data.maintenance);
        } else if (typeof data.enabled === 'boolean') {
          setMaintenance(data);
        } else {
          setMaintenance({ enabled: false });
        }
      }
    } catch {
      setMaintenance({ enabled: false });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (!maintenance) {
    return <>{children}</>;
  }

  // 1. Check if Global Maintenance is enabled
  let activeMaintenance: {
    isMaintenance: boolean;
    title: string;
    message: string;
    estimatedEndTime?: string;
    moduleName?: string;
  } = {
    isMaintenance: false,
    title: 'Under Maintenance',
    message: 'We are performing essential system updates. All funds and assets remain 100% secure.',
  };

  if (maintenance.enabled) {
    activeMaintenance = {
      isMaintenance: true,
      title: maintenance.title || 'Protocol Under Maintenance',
      message:
        maintenance.message ||
        'We are currently performing essential protocol infrastructure upgrades. All assets remain secure.',
      estimatedEndTime: maintenance.estimatedEndTime,
      moduleName: 'Global Protocol',
    };
  } else if (maintenance.modules && pathname) {
    // 2. Check Module-specific maintenance
    const cleanPath = pathname.toLowerCase();

    if (cleanPath.startsWith('/staking') && maintenance.modules.staking?.enabled) {
      const cfg = maintenance.modules.staking;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'Staking Vault Under Maintenance',
        message:
          cfg.message ||
          'Staking Vault & Reward Distribution are undergoing scheduled maintenance. Accrued rewards and principals remain intact.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'UVBE Staking',
      };
    } else if (cleanPath.startsWith('/p2p') && maintenance.modules.p2p?.enabled) {
      const cfg = maintenance.modules.p2p;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'P2P Escrow Under Maintenance',
        message:
          cfg.message ||
          'The P2P Escrow & Marketplace is currently paused for updates. Active disputes and escrow deposits remain safe.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'P2P Marketplace & Escrow',
      };
    } else if (cleanPath.startsWith('/deposit') && maintenance.modules.deposit?.enabled) {
      const cfg = maintenance.modules.deposit;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'Vault Deposits Paused',
        message:
          cfg.message ||
          'Deposits into the Multi-Asset Custody Vault are temporarily paused for maintenance.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'Vault Deposits',
      };
    } else if (cleanPath.startsWith('/redeem') && maintenance.modules.redeem?.enabled) {
      const cfg = maintenance.modules.redeem;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'Redemptions Paused',
        message:
          cfg.message || 'Vault redemptions are temporarily paused for scheduled maintenance.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'Vault Redemptions',
      };
    } else if (cleanPath.startsWith('/options') && maintenance.modules.options?.enabled) {
      const cfg = maintenance.modules.options;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'Options Trading Maintenance',
        message:
          cfg.message || 'Options trading engine and automated settlement are undergoing upgrades.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'Options Protocol',
      };
    } else if (cleanPath.startsWith('/fantasy') && maintenance.modules.fantasy?.enabled) {
      const cfg = maintenance.modules.fantasy;
      activeMaintenance = {
        isMaintenance: true,
        title: cfg.title || 'Fantasy Sports Maintenance',
        message: cfg.message || 'Fantasy Sports contests and team lineups are currently updating.',
        estimatedEndTime: cfg.estimatedEndTime,
        moduleName: 'Fantasy Arena',
      };
    }
  }

  // If no maintenance on current screen
  if (!activeMaintenance.isMaintenance) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono text-white selection:bg-[#BFFF00] selection:text-black">
      <div className="max-w-md w-full relative z-10 bg-[#0d1017]/95 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Top Icon Badge */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 flex items-center justify-center shadow-[0_0_30px_rgba(191,255,0,0.15)] relative">
          <Wrench className="w-10 h-10 text-[#BFFF00] animate-bounce" />
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black">
            !
          </div>
        </div>

        {/* Title & Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold tracking-wider uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>{activeMaintenance.moduleName} Maintenance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {activeMaintenance.title}
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">{activeMaintenance.message}</p>
        </div>

        {/* Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Vault & Fund Security</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Protected
            </span>
          </div>
          {activeMaintenance.estimatedEndTime && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Estimated Reopening</span>
              <span className="text-[#BFFF00] font-bold">{activeMaintenance.estimatedEndTime}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={checkMaintenance}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-[#BFFF00] text-black font-bold text-sm hover:bg-[#a6de00] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking status...' : 'Refresh Status'}</span>
          </button>

          <div className="flex items-center justify-center gap-3 pt-2 text-xs text-neutral-400">
            <a
              href={maintenance.telegramUrl || 'https://t.me/UnifyVault'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-xl border border-white/5"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Telegram Updates</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
