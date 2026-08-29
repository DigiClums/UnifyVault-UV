'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, X, Power } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAccount, useDisconnect } from 'wagmi';

export function AppExitModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const native =
      Capacitor.isNativePlatform() ||
      Boolean((window as any).AndroidNativeUpdater) ||
      Boolean((window as any).Capacitor?.isNativePlatform?.());

    setIsNative(native);

    // If web browser, do not register hardware or custom exit listeners
    if (!native) return;

    // Custom event to trigger exit modal in APK
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-exit-modal', handleOpenModal);

    // Hardware back button handler for Android
    let backButtonListener: any;
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (
        !canGoBack ||
        window.location.pathname === '/' ||
        window.location.pathname === '/app-home'
      ) {
        setIsOpen(true);
      } else {
        window.history.back();
      }
    }).then((handle) => {
      backButtonListener = handle;
    });

    return () => {
      window.removeEventListener('open-exit-modal', handleOpenModal);
      if (backButtonListener?.remove) {
        backButtonListener.remove();
      }
    };
  }, []);

  const handleExitApp = async () => {
    try {
      if (isNative) {
        await CapacitorApp.exitApp();
      } else {
        // In web browser fallback: disconnect wallet & close tab if allowed
        disconnect();
        setIsOpen(false);
        if (typeof window !== 'undefined' && window.close) {
          window.close();
        }
      }
    } catch (err) {
      console.error('Failed to exit app:', err);
      setIsOpen(false);
    }
  };

  const handleDisconnectOnly = () => {
    disconnect();
    setIsOpen(false);
  };

  if (!isOpen || !isNative) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm p-5 sm:p-6 rounded-3xl bg-card border-2 border-black dark:border-white/15 shadow-[6px_6px_0_#BFFF00] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border-2 border-rose-500/20">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                {isNative ? 'Exit Application?' : 'Session / Exit'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isNative ? 'Close UnifyVault Android App' : 'Disconnect or close session'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <p className="text-xs text-foreground/80 leading-relaxed">
          {isNative
            ? 'Are you sure you want to close UnifyVault? Any unconfirmed transactions will need to be re-initiated.'
            : 'Would you like to disconnect your connected wallet or close the current session?'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnectOnly}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs border-2 border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet Only</span>
            </button>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-muted hover:bg-card-hover text-foreground font-bold text-xs border-2 border-black dark:border-white/15 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExitApp}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isNative ? 'Exit App' : 'Logout & Close'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
