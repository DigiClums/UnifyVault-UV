'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Fingerprint,
  Sparkles,
  ShieldCheck,
  Send,
  Trash2,
  CheckCircle2,
  Volume2,
  Smartphone,
  Network,
  Activity,
  Coins,
  Lock,
  Timer,
  RefreshCw,
  Clock,
  Radio,
} from 'lucide-react';
import { triggerHapticNotification, playAlertChime } from '../../lib/utils/haptics';
import { CURRENT_APP_VERSION } from '../../components/common/UpdateCheckerModal';
import { isBiometricAvailable } from '../../lib/security/biometrics';

export default function UserSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 1. Notification Preferences
  const [p2pAlerts, setP2pAlerts] = useState(true);
  const [stakingAlerts, setStakingAlerts] = useState(true);
  const [updatePopups, setUpdatePopups] = useState(true);

  // 2. Security & Biometrics
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autoLockTimer, setAutoLockTimer] = useState<'immediate' | '5min' | '15min' | 'never'>(
    '5min',
  );

  // 3. Audio & Tactile Feedback
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // 4. Network & RPC
  const [customRpcUrl, setCustomRpcUrl] = useState('');
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [blockHeight, setBlockHeight] = useState<string>('Loading...');
  const [isPingingRpc, setIsPingingRpc] = useState(false);

  // 5. System Cache & Actions
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('uv_sound_enabled');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');

      const savedHaptics = localStorage.getItem('uv_haptics_enabled');
      if (savedHaptics !== null) setHapticsEnabled(savedHaptics === 'true');

      const savedBio = localStorage.getItem('uv_biometrics_enabled');
      if (savedBio !== null) setBiometricsEnabled(savedBio === 'true');

      const savedP2p = localStorage.getItem('uv_p2p_alerts');
      if (savedP2p !== null) setP2pAlerts(savedP2p === 'true');

      const savedStaking = localStorage.getItem('uv_staking_alerts');
      if (savedStaking !== null) setStakingAlerts(savedStaking === 'true');

      const savedPopups = localStorage.getItem('uv_update_popups');
      if (savedPopups !== null) setUpdatePopups(savedPopups === 'true');

      const savedLock = localStorage.getItem('uv_auto_lock_timer') as any;
      if (savedLock) setAutoLockTimer(savedLock);

      const savedRpc = localStorage.getItem('uv_custom_rpc');
      if (savedRpc) setCustomRpcUrl(savedRpc);

      isBiometricAvailable().then((res) => setBiometricsAvailable(res));
      checkRpcHealth();
    }
  }, []);

  const checkRpcHealth = async () => {
    setIsPingingRpc(true);
    const start = Date.now();
    try {
      const rpcEndpoint = customRpcUrl.trim() || 'https://mainnet.base.org';
      const res = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
      });
      const data = await res.json();
      const end = Date.now();
      setRpcLatency(end - start);
      if (data.result) {
        setBlockHeight(parseInt(data.result, 16).toLocaleString());
      }
    } catch (e) {
      setRpcLatency(null);
      setBlockHeight('Offline');
    } finally {
      setIsPingingRpc(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (hapticsEnabled) triggerHapticNotification('light');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('uv_sound_enabled', String(next));
    if (next) playAlertChime();
  };

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    localStorage.setItem('uv_haptics_enabled', String(next));
    if (next) triggerHapticNotification('success');
  };

  const toggleP2pAlerts = () => {
    const next = !p2pAlerts;
    setP2pAlerts(next);
    localStorage.setItem('uv_p2p_alerts', String(next));
    if (hapticsEnabled) triggerHapticNotification('light');
  };

  const toggleStakingAlerts = () => {
    const next = !stakingAlerts;
    setStakingAlerts(next);
    localStorage.setItem('uv_staking_alerts', String(next));
    if (hapticsEnabled) triggerHapticNotification('light');
  };

  const toggleUpdatePopups = () => {
    const next = !updatePopups;
    setUpdatePopups(next);
    localStorage.setItem('uv_update_popups', String(next));
    if (hapticsEnabled) triggerHapticNotification('light');
  };

  const isNativeApk =
    typeof window !== 'undefined' && Boolean((window as any).AndroidNativeUpdater);

  const toggleBiometrics = async () => {
    if (!biometricsEnabled) {
      // Prompt biometric authentication first to verify ownership before enabling
      const success = await promptBiometricAuth('Confirm biometric authentication setup');
      if (!success) return;
    }
    const next = !biometricsEnabled;
    setBiometricsEnabled(next);
    localStorage.setItem('uv_biometrics_enabled', String(next));
    if (hapticsEnabled) triggerHapticNotification('success');
  };

  const handleAutoLockChange = (timer: 'immediate' | '5min' | '15min' | 'never') => {
    setAutoLockTimer(timer);
    localStorage.setItem('uv_auto_lock_timer', timer);
    if (hapticsEnabled) triggerHapticNotification('light');
  };

  const handleSaveCustomRpc = () => {
    localStorage.setItem('uv_custom_rpc', customRpcUrl);
    checkRpcHealth();
    if (hapticsEnabled) triggerHapticNotification('success');
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        const nativeUpdater = (window as any).AndroidNativeUpdater;
        if (nativeUpdater && typeof nativeUpdater.clearNativeAppCache === 'function') {
          nativeUpdater.clearNativeAppCache();
        }
        setCacheCleared(true);
        if (hapticsEnabled) triggerHapticNotification('success');
        setTimeout(() => setCacheCleared(false), 3000);
      } catch (e) {}
    }
  };

  const openAndroidNotificationSettings = () => {
    if (typeof window !== 'undefined') {
      const nativeUpdater = (window as any).AndroidNativeUpdater;
      if (nativeUpdater && typeof nativeUpdater.openSystemNotificationSettings === 'function') {
        nativeUpdater.openSystemNotificationSettings();
      }
    }
  };

  const openBatteryOptimizationSettings = () => {
    if (typeof window !== 'undefined') {
      const nativeUpdater = (window as any).AndroidNativeUpdater;
      if (nativeUpdater && typeof nativeUpdater.openBatteryOptimizationSettings === 'function') {
        nativeUpdater.openBatteryOptimizationSettings();
      }
    }
  };

  const triggerUpdateModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-update-modal'));
      if (hapticsEnabled) triggerHapticNotification('light');
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-background p-6 border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="w-12 h-12 rounded-2xl bg-[#BFFF00] border-2 border-black p-1 shadow-[3px_3px_0_#000] flex items-center justify-center shrink-0">
          <Settings className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-sans">
            Settings & Preferences
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure your notifications, security, themes, network RPC and system preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Notification Preferences Card */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Notification Preferences
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage real-time push alerts and automatic trade updates.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  P2P Trade & Escrow Alerts
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Instant alerts when orders match or payment is received
                </span>
              </div>
              <button
                type="button"
                onClick={toggleP2pAlerts}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  p2pAlerts ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Staking & Rewards Alerts
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Notify when weekly staking yields are distributed
                </span>
              </div>
              <button
                type="button"
                onClick={toggleStakingAlerts}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  stakingAlerts ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block">App Update Popups</span>
                <span className="text-[10px] text-muted-foreground">
                  Show in-app update prompts when new APK is live
                </span>
              </div>
              <button
                type="button"
                onClick={toggleUpdatePopups}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  updatePopups ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>

            {/* Android APK Specific System Toggles */}
            {isNativeApk && (
              <div className="pt-2 border-t border-border-subtle space-y-2">
                <span className="text-[10px] font-black uppercase text-[#5f8f00] dark:text-[#BFFF00] block tracking-wider">
                  📱 Android OS System Settings
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openAndroidNotificationSettings}
                    className="p-2.5 rounded-xl bg-background border border-border-subtle text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left flex flex-col justify-between gap-1"
                  >
                    <span>Notification Channels</span>
                    <span className="text-[9px] text-muted-foreground font-normal">
                      Manage OS push permissions
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openBatteryOptimizationSettings}
                    className="p-2.5 rounded-xl bg-background border border-border-subtle text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left flex flex-col justify-between gap-1"
                  >
                    <span>Background Sync</span>
                    <span className="text-[9px] text-muted-foreground font-normal">
                      Battery optimization toggle
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Security & Biometrics Card */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Security & Biometrics
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Protect wallet authorizations and release crypto with device biometrics.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block flex items-center gap-1.5">
                  Fingerprint / Face Unlock
                  {isNativeApk && (
                    <span className="text-[9px] font-black uppercase bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] px-1.5 py-0.5 rounded border border-[#BFFF00]/40">
                      Android Native
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {biometricsAvailable
                    ? isNativeApk
                      ? 'Android BiometricPrompt ready'
                      : 'WebAuthn passkey ready'
                    : 'Device security active'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleBiometrics}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  biometricsEnabled ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border-subtle space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span>Auto-Lock App Timer</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {(['immediate', '5min', '15min', 'never'] as const).map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleAutoLockChange(time)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                      autoLockTimer === time
                        ? 'bg-[#BFFF00] text-black border-black shadow-[2px_2px_0_#000]'
                        : 'bg-card text-muted-foreground border-border-subtle hover:text-foreground'
                    }`}
                  >
                    {time === 'immediate' ? 'Now' : time === 'never' ? 'Off' : time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Appearance & Audio Card */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Appearance & Audio
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Switch theme palettes and sound/vibration feedback.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[56px] ${
                theme === 'light'
                  ? 'bg-[#BFFF00] text-black border-black shadow-[3px_3px_0_#000] font-black'
                  : 'bg-background hover:bg-muted text-foreground border-border-subtle font-medium'
              }`}
            >
              <Sun className="w-5 h-5 mb-1 text-amber-500" />
              <span className="text-xs">Light</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[56px] ${
                theme === 'dark'
                  ? 'bg-[#BFFF00] text-black border-black shadow-[3px_3px_0_#000] font-black'
                  : 'bg-background hover:bg-muted text-foreground border-border-subtle font-medium'
              }`}
            >
              <Moon className="w-5 h-5 mb-1 text-indigo-400" />
              <span className="text-xs">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[56px] ${
                theme === 'system'
                  ? 'bg-[#BFFF00] text-black border-black shadow-[3px_3px_0_#000] font-black'
                  : 'bg-background hover:bg-muted text-foreground border-border-subtle font-medium'
              }`}
            >
              <Monitor className="w-5 h-5 mb-1 text-sky-400" />
              <span className="text-xs">System</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={toggleSound}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                soundEnabled
                  ? 'bg-[#BFFF00]/15 border-[#BFFF00]/40 text-[#5f8f00] dark:text-[#BFFF00]'
                  : 'bg-background border-border-subtle text-muted-foreground'
              }`}
            >
              <span>Audio Chimes</span>
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleHaptics}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                hapticsEnabled
                  ? 'bg-[#BFFF00]/15 border-[#BFFF00]/40 text-[#5f8f00] dark:text-[#BFFF00]'
                  : 'bg-background border-border-subtle text-muted-foreground'
              }`}
            >
              <span>Haptic Vibe</span>
              <Radio className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. Network & RPC Settings Card */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Network className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                Network & RPC
              </h2>
            </div>
            <button
              type="button"
              onClick={checkRpcHealth}
              disabled={isPingingRpc}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Ping RPC"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPingingRpc ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Live connectivity status on Base Mainnet (Chain ID 8453).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-background border border-border-subtle">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">
                Latency
              </span>
              <span className="text-xs font-black text-[#5f8f00] dark:text-[#BFFF00]">
                {rpcLatency !== null ? `${rpcLatency} ms` : 'Checking...'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border-subtle">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">
                Block Height
              </span>
              <span className="text-xs font-black text-foreground font-mono">#{blockHeight}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-foreground block">
              Custom Base RPC URL (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://mainnet.base.org"
                value={customRpcUrl}
                onChange={(e) => setCustomRpcUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-background border border-border-subtle text-xs font-mono text-foreground focus:outline-none focus:border-black dark:focus:border-white"
              />
              <button
                type="button"
                onClick={handleSaveCustomRpc}
                className="px-3.5 py-2 rounded-xl bg-[#BFFF00] text-black font-bold text-xs border border-black shadow-[2px_2px_0_#000]"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* 5. App Info & Version Updates (Full Width) */}
        <div className="md:col-span-2 bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              App Info, Version & Maintenance
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-background border border-border-subtle">
            <div>
              <span className="text-sm font-bold text-foreground block">
                UnifyVault Decentralized Suite
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                App Version: v{CURRENT_APP_VERSION} • Production Release (Base Mainnet)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerUpdateModal}
                className="px-4 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Check for Updates</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCache}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-subtle text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {cacheCleared ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5f8f00]" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{cacheCleared ? 'Cache Cleaned Successfully!' : 'Clear App Cache'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://t.me/UVBE_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0088cc]/15 text-[#0088cc] border border-[#0088cc]/30 text-xs font-bold hover:bg-[#0088cc]/25 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Telegram Bot (@UVBE_bot)</span>
              </a>

              <a
                href="https://docs.unifyvault.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-foreground hover:bg-muted transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Official Docs</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
