'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, ScanLine, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

/**
 * QR Code Scanner Modal — opens the device camera and reads QR codes.
 * Uses html5-qrcode under the hood (dynamically imported to avoid SSR issues).
 */
export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        // State 2 = SCANNING in html5-qrcode
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setError(null);
    setIsStarting(true);

    const startScanner = async () => {
      try {
        // Dynamic import to avoid SSR/window issues
        const { Html5Qrcode } = await import('html5-qrcode');

        if (cancelled) return;

        const scannerId = 'qr-scanner-region';
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText: string) => {
            // Extract wallet address from various QR formats
            let address = decodedText.trim();

            // Handle ethereum: URI scheme (EIP-681)
            if (address.toLowerCase().startsWith('ethereum:')) {
              address = address.replace(/^ethereum:/i, '').split(/[?@/]/)[0];
            }

            onScan(address);
            stopScanner();
            onClose();
          },
          () => {
            // QR code not detected in this frame — no action needed
          }
        );

        if (cancelled) {
          await stopScanner();
          return;
        }

        setIsStarting(false);
      } catch (err: any) {
        if (!cancelled) {
          setIsStarting(false);
          if (err?.message?.includes('NotAllowedError') || err?.message?.includes('Permission')) {
            setError('Camera permission denied. Please allow camera access and try again.');
          } else if (err?.message?.includes('NotFoundError')) {
            setError('No camera found. Please connect a camera and try again.');
          } else {
            setError(err?.message || 'Failed to start QR scanner.');
          }
        }
      }
    };

    // Small delay to let the DOM render the container
    const timer = setTimeout(startScanner, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, onScan, onClose, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          stopScanner();
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 bg-card border-2 border-black dark:border-white/15 rounded-2xl shadow-[6px_6px_0_#000] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Scan QR Code</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black">
          <div
            id="qr-scanner-region"
            ref={containerRef}
            className="w-full min-h-[300px]"
          />

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              <ScanLine className="w-8 h-8 text-[#BFFF00] animate-pulse" />
              <p className="text-sm text-white/70 font-medium">Starting camera...</p>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 m-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Hint */}
        <div className="px-4 py-3 text-center border-t border-border-subtle">
          <p className="text-xs text-muted-foreground">
            Point your camera at a wallet address QR code
          </p>
        </div>
      </div>
    </div>
  );
}
