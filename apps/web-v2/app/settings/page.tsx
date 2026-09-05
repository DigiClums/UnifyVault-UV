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
  ExternalLink,
  Volume2,
  VolumeX,
  Smartphone,
  Info,
} from 'lucide-react';
import { triggerHapticNotification, playAlertChime } from '../../lib/utils/haptics';
import { CURRENT_APP_VERSION } from '../../components/common/UpdateCheckerModal';
import { isBiometricAvailable } from '../../lib/security/biometrics';

export default function UserSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [p2pAlerts, setP2pAlerts] = useState(true);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
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

      isBiometricAvailable().then((res) => setBiometricsAvailable(res));
    }
  }, []);

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

  const toggleBiometrics = () => {
    const next = !biometricsEnabled;
    setBiometricsEnabled(next);
    localStorage.setItem('uv_biometrics_enabled', String(next));
    if (hapticsEnabled) triggerHapticNotification('success');
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        setCacheCleared(true);
        if (hapticsEnabled) triggerHapticNotification('success');
        setTimeout(() => setCacheCleared(false), 3000);
      } catch (e) {}
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
            Customize your display, alerts, security, and application experience.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Appearance & Theme Card */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Display & Theme Mode
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Choose your preferred color theme. Changes sync instantly across the app.
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
        </div>

        {/* Audio & Haptic Feedback */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Sound & Vibrations
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure sound effects and tactile feedback for trading & wallet actions.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block">Notification Sound</span>
                <span className="text-[10px] text-muted-foreground">
                  Play tone on P2P orders & updates
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  soundEnabled ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
              <div>
                <span className="text-xs font-bold text-foreground block">Haptic Vibration</span>
                <span className="text-[10px] text-muted-foreground">
                  Vibrate on button taps & actions
                </span>
              </div>
              <button
                type="button"
                onClick={toggleHaptics}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                  hapticsEnabled ? 'bg-[#BFFF00] justify-end' : 'bg-muted justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Biometrics */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Security & Biometrics
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Protect your transactions with device biometric verification.
          </p>

          <div className="p-3 rounded-xl bg-background border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">Fingerprint / Face ID</span>
              <span className="text-[10px] text-muted-foreground">
                {biometricsAvailable
                  ? 'Hardware biometric sensor ready'
                  : 'Device biometric authentication active'}
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
        </div>

        {/* App Version & Updates */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#000] space-y-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              App Version & System
            </h2>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle">
            <div>
              <span className="text-xs font-bold text-foreground block">Current Version</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Release: v{CURRENT_APP_VERSION} (Base Mainnet)
              </span>
            </div>
            <button
              type="button"
              onClick={triggerUpdateModal}
              className="px-3.5 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Check Updates</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {cacheCleared ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5f8f00]" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{cacheCleared ? 'Cache Cleared!' : 'Clear App Cache'}</span>
            </button>

            <a
              href="https://t.me/UVBE_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0088cc]/15 text-[#0088cc] border border-[#0088cc]/30 text-xs font-bold hover:bg-[#0088cc]/25 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>@UVBE_bot</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
