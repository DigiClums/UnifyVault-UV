'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldCheck,
  Power,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  Loader2,
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';

export interface ModuleConfig {
  enabled: boolean;
  title: string;
  message: string;
  estimatedEndTime: string;
}

export interface MaintenanceSettings {
  enabled: boolean;
  title: string;
  message: string;
  estimatedEndTime: string;
  allowAdminBypass: boolean;
  telegramUrl: string;
  modules: {
    staking: ModuleConfig;
    p2p: ModuleConfig;
    deposit: ModuleConfig;
    redeem: ModuleConfig;
    options: ModuleConfig;
  };
}

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enabled: false,
  title: 'Protocol System Upgrade',
  message:
    'We are currently performing essential infrastructure maintenance and contract optimization. All vault assets and staking balances are 100% secure.',
  estimatedEndTime: 'Coming back shortly',
  allowAdminBypass: true,
  telegramUrl: 'https://t.me/UnifyVault',
  modules: {
    staking: {
      enabled: false,
      title: 'Staking Vault Maintenance',
      message:
        'Staking Vault & Reward Distribution are undergoing contract maintenance. Accrued rewards remain intact.',
      estimatedEndTime: 'Coming back shortly',
    },
    p2p: {
      enabled: false,
      title: 'P2P Escrow Maintenance',
      message:
        'P2P Escrow & Marketplace is temporarily paused for database and contract sync. Escrow deposits remain safe.',
      estimatedEndTime: 'Coming back shortly',
    },
    deposit: {
      enabled: false,
      title: 'Deposits Paused',
      message: 'Vault deposits are temporarily paused for routine maintenance.',
      estimatedEndTime: 'Coming back shortly',
    },
    redeem: {
      enabled: false,
      title: 'Redemptions Paused',
      message: 'Vault redemptions are temporarily paused for liquidity rebalancing.',
      estimatedEndTime: 'Coming back shortly',
    },
    options: {
      enabled: false,
      title: 'Options Trading Maintenance',
      message: 'Options protocol and settlement engine are undergoing maintenance.',
      estimatedEndTime: 'Coming back shortly',
    },
  },
};

export function MaintenanceControlCard() {
  const [settings, setSettings] = useState<MaintenanceSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/maintenance');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          modules: {
            ...DEFAULT_SETTINGS.modules,
            ...(data.modules || {}),
          },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (customSettings?: MaintenanceSettings) => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);
      const target = customSettings || settings;
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });

      if (!res.ok) {
        throw new Error('Failed to update maintenance configuration');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGlobal = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    handleSave(updated);
  };

  const toggleModule = (modKey: keyof MaintenanceSettings['modules']) => {
    const currentMod = settings.modules[modKey];
    const updated = {
      ...settings,
      modules: {
        ...settings.modules,
        [modKey]: {
          ...currentMod,
          enabled: !currentMod.enabled,
        },
      },
    };
    setSettings(updated);
    handleSave(updated);
  };

  const updateModuleField = (
    modKey: keyof MaintenanceSettings['modules'],
    field: keyof ModuleConfig,
    value: string | boolean,
  ) => {
    setSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [modKey]: {
          ...settings.modules[modKey],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="bg-[#0e1118] border border-white/10 rounded-2xl p-5 sm:p-7 space-y-6 font-mono shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Maintenance Mode Manager
              </h2>
              <StatusBadge
                status={settings.enabled ? 'error' : 'healthy'}
                label={settings.enabled ? 'GLOBAL LOCK ACTIVE' : 'LIVE PRODUCTION'}
              />
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Control granular maintenance gates for Staking, P2P, and Vault Modules with zero
              downtime
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSettings()}
            disabled={isLoading || isSaving}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isLoading || isSaving}
            className="px-4 py-2 rounded-xl bg-[#BFFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#a6de00] active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-[#BFFF00]/10 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Toggle Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          settings.enabled ? 'bg-red-950/20 border-red-500/40' : 'bg-white/[0.02] border-white/10'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Power
              className={`w-4 h-4 ${settings.enabled ? 'text-red-400' : 'text-neutral-400'}`}
            />
            <h3 className="text-base font-bold text-white">Entire App Maintenance (Global Lock)</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Locks the entire frontend application behind a maintenance screen while maintaining
            admin access.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleGlobal}
          disabled={isSaving}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            settings.enabled
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600'
              : 'bg-white/10 text-neutral-200 hover:bg-white/20'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{settings.enabled ? 'DISABLE GLOBAL LOCK' : 'ENABLE GLOBAL LOCK'}</span>
        </button>
      </div>

      {/* Module Level Granular Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#BFFF00]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Granular Module Maintenance Toggles
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staking Module */}
          <div
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              settings.modules.staking.enabled
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥩</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Staking Vault (/staking)</h4>
                  <span className="text-[10px] text-neutral-400">
                    Vault 0x625a & Reward Distributor
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleModule('staking')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  settings.modules.staking.enabled
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {settings.modules.staking.enabled ? 'MAINTENANCE ON' : 'ACTIVE'}
              </button>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
              <input
                type="text"
                value={settings.modules.staking.title}
                onChange={(e) => updateModuleField('staking', 'title', e.target.value)}
                placeholder="Title"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
              <input
                type="text"
                value={settings.modules.staking.estimatedEndTime}
                onChange={(e) => updateModuleField('staking', 'estimatedEndTime', e.target.value)}
                placeholder="Estimated Reopening (e.g. 2:00 PM UTC)"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#BFFF00] placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>

          {/* P2P Module */}
          <div
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              settings.modules.p2p.enabled
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <div>
                  <h4 className="text-sm font-bold text-white">P2P Escrow & Market (/p2p)</h4>
                  <span className="text-[10px] text-neutral-400">
                    Escrow 0x4009 & Marketplace 0x6e3b
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleModule('p2p')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  settings.modules.p2p.enabled
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {settings.modules.p2p.enabled ? 'MAINTENANCE ON' : 'ACTIVE'}
              </button>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
              <input
                type="text"
                value={settings.modules.p2p.title}
                onChange={(e) => updateModuleField('p2p', 'title', e.target.value)}
                placeholder="Title"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
              <input
                type="text"
                value={settings.modules.p2p.estimatedEndTime}
                onChange={(e) => updateModuleField('p2p', 'estimatedEndTime', e.target.value)}
                placeholder="Estimated Reopening"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#BFFF00] placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>

          {/* Deposits Module */}
          <div
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              settings.modules.deposit.enabled
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📥</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Vault Deposits (/deposit)</h4>
                  <span className="text-[10px] text-neutral-400">Mint UVBE Index Tokens</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleModule('deposit')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  settings.modules.deposit.enabled
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {settings.modules.deposit.enabled ? 'MAINTENANCE ON' : 'ACTIVE'}
              </button>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
              <input
                type="text"
                value={settings.modules.deposit.title}
                onChange={(e) => updateModuleField('deposit', 'title', e.target.value)}
                placeholder="Title"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>

          {/* Redemptions Module */}
          <div
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              settings.modules.redeem.enabled
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📤</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Vault Redemptions (/redeem)</h4>
                  <span className="text-[10px] text-neutral-400">Burn UVBE to Underlying</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleModule('redeem')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  settings.modules.redeem.enabled
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {settings.modules.redeem.enabled ? 'MAINTENANCE ON' : 'ACTIVE'}
              </button>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
              <input
                type="text"
                value={settings.modules.redeem.title}
                onChange={(e) => updateModuleField('redeem', 'title', e.target.value)}
                placeholder="Title"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#BFFF00]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
