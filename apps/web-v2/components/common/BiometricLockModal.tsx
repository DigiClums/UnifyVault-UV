'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Fingerprint, Lock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { promptBiometricAuth, isBiometricAvailable } from '../../lib/security/biometrics';

export function BiometricLockModal() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const backgroundTimestampRef = useRef<number | null>(null);

  // Check if biometrics is enabled in user settings
  const checkShouldLock = useCallback((elapsedMs: number = 0): boolean => {
    if (typeof window === 'undefined') return false;
    const enabled = localStorage.getItem('uv_biometrics_enabled') === 'true';
    if (!enabled) return false;

    const timer = localStorage.getItem('uv_auto_lock_timer') || 'immediate';
    if (timer === 'never') return false;

    if (timer === 'immediate') return true;
    if (timer === '5min') return elapsedMs >= 5 * 60 * 1000;
    if (timer === '15min') return elapsedMs >= 15 * 60 * 1000;

    return true;
  }, []);

  const triggerUnlock = useCallback(async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const success = await promptBiometricAuth('Unlock UnifyVault');
      if (success) {
        setIsLocked(false);
        setAuthError(null);
        backgroundTimestampRef.current = null;
      } else {
        setAuthError('Authentication failed or cancelled. Tap below to try again.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Biometric authentication error. Tap to retry.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  // Initial mount check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    isBiometricAvailable().then((available) => {
      setIsSupported(available);
      const enabled = localStorage.getItem('uv_biometrics_enabled') === 'true';
      if (enabled && available) {
        setIsLocked(true);
      }
    });

    // Handle App visibility / background-foreground transitions
    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundTimestampRef.current = Date.now();
      } else {
        const backgroundTime = backgroundTimestampRef.current;
        const elapsed = backgroundTime ? Date.now() - backgroundTime : 0;
        if (checkShouldLock(elapsed)) {
          setIsLocked(true);
        }
      }
    };

    // Custom lock event listener
    const handleManualLock = () => {
      const enabled = localStorage.getItem('uv_biometrics_enabled') === 'true';
      if (enabled) {
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('uv-lock-app', handleManualLock);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('uv-lock-app', handleManualLock);
    };
  }, [checkShouldLock]);

  // Auto-prompt biometric prompt as soon as lock is activated
  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => {
        triggerUnlock();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLocked, triggerUnlock]);

  if (!isLocked) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-background/95 backdrop-blur-xl animate-in fade-in duration-200"
      data-testid="biometric-lock-modal"
    >
      <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-card border-2 border-black dark:border-white/20 shadow-[8px_8px_0_#BFFF00] text-center space-y-6">
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#BFFF00]/20 animate-pulse border border-[#BFFF00]/40" />
          <div className="relative p-4 rounded-2xl bg-card border-2 border-black dark:border-white/20 shadow-[3px_3px_0_#000]">
            <Lock className="w-8 h-8 text-[#5f8f00] dark:text-[#BFFF00]" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            UnifyVault Locked
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fingerprint or biometric verification is required to access your account & assets.
          </p>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Unlock Trigger Button */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={triggerUnlock}
            disabled={isAuthenticating}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#BFFF00] hover:bg-[#a6de00] text-black font-black text-sm border-2 border-black shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Biometrics...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Tap to Unlock with Fingerprint</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Hardware-Backed Biometric Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
