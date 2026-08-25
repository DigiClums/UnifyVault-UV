'use client';

import React, { useEffect, useState } from 'react';
import { Download, Sparkles, X, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

export const CURRENT_APP_VERSION = '2.0.0';

export function UpdateCheckerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('https://app.unifyvault.xyz/unifyvault.apk');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function checkVersion() {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        if (data.latestVersion && data.latestVersion !== CURRENT_APP_VERSION) {
          setLatestVersion(data.latestVersion);
          setReleaseNotes(data.releaseNotes || ['Performance improvements & security updates']);
          setIsMandatory(Boolean(data.mandatory));
          if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
          setIsOpen(true);
        }
      } catch {
        // Silently ignore if offline
      }
    }

    const timer = setTimeout(checkVersion, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDirectInstall = async () => {
    setIsDownloading(true);
    setDownloadProgress(10);

    try {
      // Progress simulation for direct in-app download stream
      const interval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 95;
          }
          return prev + 25;
        });
      }, 400);

      // Direct APK download trigger
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'unifyvault.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        clearInterval(interval);
        setDownloadProgress(100);
        setDownloadCompleted(true);
        setIsDownloading(false);
      }, 2000);
    } catch {
      window.location.href = downloadUrl;
      setIsDownloading(false);
    }
  };

  if (!isOpen || !latestVersion) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1117] border-2 border-[#BFFF00] text-white rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(191,255,0,0.2)] font-mono space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#BFFF00] text-black flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">New Update Available!</h3>
              <p className="text-xs text-[#BFFF00] font-mono">
                v{CURRENT_APP_VERSION} → v{latestVersion}
              </p>
            </div>
          </div>
          {!isMandatory && !isDownloading && (
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-white/70 font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#BFFF00]" />
            <span>What's New:</span>
          </div>
          <ul className="text-xs text-white/80 space-y-1.5 pl-2 list-disc list-inside">
            {releaseNotes.map((note, idx) => (
              <li key={idx} className="leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
        </div>

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
          {downloadCompleted ? (
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

          {!isMandatory && !isDownloading && (
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 text-center text-xs text-white/50 hover:text-white transition-colors font-sans"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
