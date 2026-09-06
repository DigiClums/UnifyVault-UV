'use client';

import React, { useEffect, useState } from 'react';
import { Download, Sparkles, X, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

export const CURRENT_APP_VERSION: string = (() => {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (version && version.trim() !== '') {
    return version.trim();
  }
  // Safe default for development/local builds if env var not explicitly supplied
  return '2.3.8';
})();

const VERSION_METADATA_URL =
  'https://raw.githubusercontent.com/DigiClums/UnifyVault-UV/main/apps/web-v2/public/version.json';

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((num) => parseInt(num, 10) || 0);

  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);

  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

export function UpdateCheckerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWebBanner, setIsWebBanner] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [isUpToDate, setIsUpToDate] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(
    'https://github.com/DigiClums/UnifyVault-UV/releases/latest/download/UnifyVault-latest.apk',
  );
  const [iosStoreUrl, setIosStoreUrl] = useState(process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || '');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isNative = Boolean(
      (window as any).AndroidNativeUpdater ||
      ((window as any).Capacitor &&
        typeof (window as any).Capacitor.isNativePlatform === 'function' &&
        (window as any).Capacitor.isNativePlatform()),
    );

    async function checkVersion(isManual = false) {
      try {
        const res = await fetch(`${VERSION_METADATA_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.latestVersion) {
          setLatestVersion(data.latestVersion);
          setReleaseNotes(data.releaseNotes || ['Performance improvements & security updates']);
          setIsMandatory(Boolean(data.mandatory));
          if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
          if (data.iosStoreUrl) setIosStoreUrl(data.iosStoreUrl);

          const hasNewUpdate = isNewerVersion(data.latestVersion, CURRENT_APP_VERSION);

          // On Web Browser: Do NOT auto-pop on page load. Only open if user explicitly clicks "App / Update" button.
          if (!isNative) {
            if (isManual) {
              setIsWebBanner(true);
              setIsOpen(true);
            }
            return;
          }

          // On Native Android/iOS App:
          if (hasNewUpdate) {
            setIsWebBanner(false);
            setIsUpToDate(false);
            setIsOpen(true);
          } else if (isManual) {
            setIsWebBanner(false);
            setIsUpToDate(true);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Update check error:', err);
      }
    }

    // Auto check on mount (only triggers popup on native app when outdated)
    checkVersion(false);
    const interval = setInterval(() => checkVersion(false), 30_000);

    const handleProgress = (e: any) => {
      if (typeof e.detail?.progress === 'number') {
        setDownloadProgress(e.detail.progress);
      }
    };

    const handleComplete = () => {
      setDownloadProgress(100);
      setDownloadCompleted(true);
      setIsDownloading(false);
    };

    const handleFailed = () => {
      setIsDownloading(false);
      setDownloadProgress(0);
    };

    window.addEventListener('native-updater-downloadProgress', handleProgress as EventListener);
    window.addEventListener('native-updater-downloadComplete', handleComplete as EventListener);
    window.addEventListener('native-updater-downloadFailed', handleFailed as EventListener);

    const handleManualTrigger = () => {
      checkVersion(true);
    };

    window.addEventListener('open-update-modal', handleManualTrigger);

    // Keyboard ESC listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloading) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        'native-updater-downloadProgress',
        handleProgress as EventListener,
      );
      window.removeEventListener(
        'native-updater-downloadComplete',
        handleComplete as EventListener,
      );
      window.removeEventListener('native-updater-downloadFailed', handleFailed as EventListener);
      window.removeEventListener('open-update-modal', handleManualTrigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDownloading]);

  // Support Android hardware back button closing the modal if open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleCustomClose = () => {
      if (!isDownloading) {
        setIsOpen(false);
      }
    };

    // Close when custom event fires
    window.addEventListener('close-update-modal', handleCustomClose);

    // If Capacitor App plugin exists, register priority backButton listener while modal is open
    let backHandle: any;
    try {
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.App?.addListener) {
        cap.Plugins.App.addListener('backButton', () => {
          if (!isDownloading) {
            setIsOpen(false);
          }
        }).then((h: any) => {
          backHandle = h;
        });
      }
    } catch {}

    return () => {
      window.removeEventListener('close-update-modal', handleCustomClose);
      if (backHandle?.remove) {
        backHandle.remove();
      }
    };
  }, [isOpen, isDownloading]);

  const handleDirectInstall = async () => {
    // Check if running on native iOS
    const isIos =
      typeof window !== 'undefined' &&
      ((window as any).Capacitor?.getPlatform?.() === 'ios' ||
        /iPad|iPhone|iPod/.test(navigator.userAgent));

    if (isIos) {
      if (iosStoreUrl && iosStoreUrl.trim() !== '') {
        window.open(iosStoreUrl, '_system');
      } else {
        alert(`UnifyVault v${latestVersion} is available. App Store URL is not configured yet.`);
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      if (typeof window !== 'undefined' && (window as any).AndroidNativeUpdater) {
        const fileName = `UnifyVault-v${latestVersion}.apk`;
        (window as any).AndroidNativeUpdater.downloadAndInstallApk(downloadUrl, fileName);
        return;
      }

      // Browser fallback: Download latest APK
      window.open(downloadUrl, '_blank');
      setIsDownloading(false);
    } catch {
      window.open(downloadUrl, '_blank');
      setIsDownloading(false);
    }
  };

  if (!isOpen || !latestVersion) return null;

  return (
    <div
      onClick={(e) => {
        // Backdrop click to close / go back
        if (e.target === e.currentTarget && !isDownloading) {
          setIsOpen(false);
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1117] border-2 border-[#BFFF00] text-white rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(191,255,0,0.2)] font-mono space-y-5 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl ${
                isUpToDate ? 'bg-emerald-500 text-black' : 'bg-[#BFFF00] text-black'
              } flex items-center justify-center font-black`}
            >
              {isUpToDate ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isWebBanner ? (
                <Download className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                {isWebBanner
                  ? 'Get UnifyVault Mobile App'
                  : isUpToDate
                    ? 'You Are Up to Date!'
                    : 'New Update Available!'}
              </h3>
              <p className="text-xs text-[#BFFF00] font-mono">
                {isWebBanner
                  ? `Latest Version: v${latestVersion}`
                  : isUpToDate
                    ? `Current Version: v${CURRENT_APP_VERSION}`
                    : `v${CURRENT_APP_VERSION} → v${latestVersion}`}
              </p>
            </div>
          </div>
          {!isDownloading && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              title="Close and Go Back"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        {isWebBanner ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              Download the official <strong>UnifyVault Android APK (v{latestVersion})</strong> for
              biometric security, hardware-backed vault isolation, and instant P2P notifications.
            </p>
          </div>
        ) : isUpToDate ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              UnifyVault is running on the latest production version (
              <strong>v{CURRENT_APP_VERSION}</strong>). No update is needed.
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs text-white/70 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#BFFF00] shrink-0" />
              <span>What's New:</span>
            </div>
            <ul className="text-xs text-white/80 space-y-2 pl-2 list-disc list-inside">
              {releaseNotes.map((note, idx) => {
                const isChecksum = note.toLowerCase().includes('sha-256');
                return (
                  <li key={idx} className="leading-relaxed break-words break-all text-[11px]">
                    {isChecksum ? (
                      <span className="font-mono text-[10px] text-white/70 opacity-90">{note}</span>
                    ) : (
                      note
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Progress bar if downloading */}
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Downloading update package...</span>
              <span className="text-[#BFFF00] font-bold">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#BFFF00] h-full transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {isWebBanner ? (
            <button
              onClick={() => {
                window.open(downloadUrl, '_blank');
                setIsOpen(false);
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(191,255,0,0.3)] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK (v{latestVersion})</span>
            </button>
          ) : isUpToDate ? (
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Already Updated</span>
            </button>
          ) : downloadCompleted ? (
            <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Downloaded! Opening Installer...</span>
            </div>
          ) : (
            <button
              disabled={isDownloading}
              onClick={handleDirectInstall}
              className="w-full py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(191,255,0,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading {downloadProgress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Update Now (Direct Install)</span>
                </>
              )}
            </button>
          )}

          {!isDownloading && !isMandatory && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition-colors font-sans flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            >
              <span>← Back to App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
