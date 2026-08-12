'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldAlert, Send, FileText, CheckCircle2, User, Lock } from 'lucide-react';
import { DisputeMessage, DisputeRecord } from '../../lib/dispute/types';

interface DisputeChatWorkspaceProps {
  tradeId: number;
  userAddress: string;
  isBuyer: boolean;
  isSeller: boolean;
  isAdmin?: boolean;
}

export function DisputeChatWorkspace({
  tradeId,
  userAddress,
  isBuyer,
  isSeller,
  isAdmin = false,
}: DisputeChatWorkspaceProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [dispute, setDispute] = useState<DisputeRecord | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChat = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/p2p/dispute-chat/messages?tradeId=${tradeId}&userAddress=${userAddress}`);
      const data = await res.json();

      if (data.success) {
        setMessages(data.messages || []);
        setDispute(data.dispute || null);
      } else {
        setError(data.error || 'Failed to load dispute chat workspace.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching dispute chat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress && tradeId) {
      fetchChat();
    }
  }, [tradeId, userAddress]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    try {
      setIsSending(true);
      setError(null);

      const res = await fetch('/api/p2p/dispute-chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-auth': 'true', // Sandbox/dev header
        },
        body: JSON.stringify({
          tradeId,
          userAddress,
          content: newMsg.trim(),
          evidenceHash: evidenceHash.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewMsg('');
        setEvidenceHash('');
        await fetchChat();
      } else {
        setError(data.error || 'Failed to post message.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error sending message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-background border-2 border-rose-500/30 rounded-2xl shadow-[6px_6px_0_#000] p-5 space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground font-sans tracking-tight">
              Private Dispute Workspace (Blockscan Chat Style)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Trade-bound private investigation channel between Buyer, Seller & Admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <Lock className="w-3.5 h-3.5" />
          <span>{dispute?.status || 'DISPUTE_OPEN'}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-xl border border-black/10 dark:border-white/10 text-xs">
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground animate-pulse">Loading dispute messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No dispute messages recorded yet.</div>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderAddress.toLowerCase() === userAddress.toLowerCase();
            return (
              <div
                key={m.messageId}
                className={`p-3 rounded-xl border ${
                  m.senderRole === 'ADMIN'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                    : m.senderRole === 'SYSTEM'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200 text-center font-bold'
                    : isSelf
                    ? 'bg-[#BFFF00]/20 border-black/20 ml-6'
                    : 'bg-background border-black/10 dark:border-white/10 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold opacity-75 mb-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {m.senderRole} ({m.senderAddress.slice(0, 6)}...{m.senderAddress.slice(-4)})
                  </span>
                  <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>

                <p className="whitespace-pre-wrap">{m.content}</p>

                {m.evidenceHash && (
                  <div className="mt-2 text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 rounded-md">
                    <FileText className="w-3 h-3 text-rose-500" />
                    <span>Evidence Hash: {m.evidenceHash}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="space-y-2">
        <textarea
          rows={2}
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type your dispute statement or response..."
          className="w-full p-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
        />

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={evidenceHash}
            onChange={(e) => setEvidenceHash(e.target.value)}
            placeholder="Optional Evidence Hash (SHA-256)"
            className="flex-1 px-3 py-2 rounded-xl border border-black/20 dark:border-white/20 bg-background text-[11px] font-bold focus:outline-none"
          />

          <button
            type="submit"
            disabled={isSending || !newMsg.trim()}
            className="px-4 py-2 bg-[#BFFF00] text-black font-black text-xs rounded-xl border border-black shadow-[2px_2px_0_#000] hover:translate-y-[-1px] disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Sending...' : 'Send Message'}</span>
          </button>
        </div>
      </form>

      <p className="text-[10px] text-muted-foreground text-center font-sans">
        🔒 All dispute messages & evidence are private to trade participants and authorized admins. UTRs and chat records are never exposed in public orderbook APIs.
      </p>
    </div>
  );
}
