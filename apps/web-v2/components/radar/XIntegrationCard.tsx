'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  fetchXStatus,
  getXConnectUrl,
  disconnectX,
  triggerXSignalCollection,
  XIntegrationStatus,
} from '../../lib/radar/radarApi';

export default function XIntegrationCard() {
  const [status, setStatus] = useState<XIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetchXStatus();
      setStatus(res);
    } catch (err: any) {
      console.error('Failed to load X status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Check URL query parameters for OAuth redirect feedback
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const xStatus = params.get('x_status');
      const xUsername = params.get('x_username');
      const msg = params.get('message');

      if (xStatus === 'connected') {
        setActionMessage(
          `X Account @${xUsername || ''} connected successfully via OAuth 2.0 PKCE.`,
        );
      } else if (xStatus === 'error') {
        setErrorMessage(msg || 'X authorization was declined or encountered an error.');
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      const { url } = await getXConnectUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate X authorization.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnectX();
      setActionMessage('X integration disconnected. Tokens revoked from server memory.');
      await loadStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestCollect = async () => {
    try {
      setIsCollecting(true);
      setActionMessage('Querying public X signals via authorized connection...');
      const res = await triggerXSignalCollection();
      if (res.status === 'SUCCESS') {
        setActionMessage(
          `Scanned ${res.signalsCollected} public signals. Persisted ${res.newSignalsPersisted} new signals to early radar.`,
        );
      } else if (res.status === 'TIER_RESTRICTED') {
        setActionMessage(`Account @${status?.xUsername} active. Note: ${res.message}`);
      } else {
        setActionMessage(`Status: ${res.status}. ${res.message || ''}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signal collection failed.');
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] font-mono space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-sm">
            𝕏
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">X (TWITTER) INTEGRATION</h3>
            <span className="text-[10px] text-muted-foreground">
              OAUTH 2.0 + PKCE AUTHORIZED INGESTION
            </span>
          </div>
        </div>

        {/* Status Pill */}
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : status?.connected ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CONNECTED (@{status.xUsername})
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-black/10 dark:border-white/10">
            DISCONNECTED
          </span>
        )}
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="p-3 bg-[#BFFF00]/10 border border-[#BFFF00] rounded-xl text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500 rounded-xl text-xs flex items-center justify-between text-rose-400">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Body */}
      {status?.connected ? (
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authorized Account:</span>
              <a
                href={`https://x.com/${status.xUsername}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#BFFF00] hover:underline flex items-center gap-1"
              >
                @{status.xUsername} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Granted Scopes:</span>
              <span className="font-bold text-muted-foreground">
                {status.scopes.join(', ') || 'users.read, tweet.read, offline.access'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Token Security:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM Encrypted at Rest
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleTestCollect}
              disabled={isCollecting}
              className="px-4 py-2 bg-[#BFFF00] text-black font-bold text-xs rounded-xl border border-black hover:bg-[#a6de00] transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCollecting ? 'animate-spin' : ''}`} />
              {isCollecting ? 'Scanning Signals...' : 'Scan Public Web3 Signals'}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-3.5 py-2 bg-muted hover:bg-rose-500 hover:text-white font-bold text-xs rounded-xl border border-black/10 dark:border-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" /> Disconnect X
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Connect an authorized X (Twitter) Developer or user account using secure **OAuth 2.0
            PKCE** to enable verified signal collection for early Web3 protocols.
          </p>

          <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Security Guarantees:
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>No password stored or requested.</li>
              <li>
                Read-only scopes (<code className="text-cyan-400">users.read</code>,{' '}
                <code className="text-cyan-400">tweet.read</code>).
              </li>
              <li>Tokens encrypted with AES-256-GCM server-side.</li>
              <li>Anti-CSRF state verification with PKCE (S256).</li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full sm:w-auto px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs rounded-xl hover:bg-[#BFFF00] hover:text-black dark:hover:bg-[#BFFF00] dark:hover:text-black transition-colors flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Initiating OAuth 2.0 PKCE...
              </>
            ) : (
              <>
                <span className="font-black">𝕏</span> Connect X Account
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
