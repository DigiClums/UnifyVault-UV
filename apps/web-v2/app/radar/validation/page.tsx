'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar,
  ShieldCheck,
  Activity,
  GitBranch,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Globe,
  TrendingUp,
  TrendingDown,
  XCircle,
  FileText,
  Calendar,
  Filter,
  Plus,
  Compass,
} from 'lucide-react';
import {
  fetchValidationSummary,
  recordProjectOutcome,
  recordExternalDiscovery,
  rejectCandidate,
  triggerValidationSnapshot,
  ValidationSummary,
} from '../../../lib/radar/radarApi';
import XIntegrationCard from '../../../components/radar/XIntegrationCard';
import { ZeroCostDiscoveryCard } from '../../../components/radar/ZeroCostDiscoveryCard';

export default function ValidationDashboard() {
  const [data, setData] = useState<ValidationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<
    'ALL' | 'BASELINE' | 'NEW' | 'ACTIVE' | 'REJECTED' | 'DISCOVERIES'
  >('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<'OUTCOME' | 'EXTERNAL_DISCOVERY' | 'REJECT' | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [outcomeForm, setOutcomeForm] = useState({
    status: 'ACTIVE',
    source: 'GitHub Activity',
    sourceUrl: '',
    evidence: '',
    notes: '',
  });

  const [discoveryForm, setDiscoveryForm] = useState({
    source: 'RootData',
    sourceUrl: '',
    discoveryType: 'PROJECT_DIRECTORY',
    discoveredAt: new Date().toISOString().split('T')[0],
    evidence: '',
  });

  const [rejectForm, setRejectForm] = useState({
    rejectionReason: 'TUTORIAL',
    notes: '',
  });

  const loadValidationData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchValidationSummary();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load validation summary', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadValidationData();
  }, []);

  const handleSnapshotRun = async () => {
    try {
      setIsSubmitting(true);
      setActionMessage('Running automated daily validation snapshot across all candidates...');
      const res = await triggerValidationSnapshot();
      setActionMessage(`Snapshot completed for ${res.snapshotCount} candidates.`);
      await loadValidationData();
    } catch (err: any) {
      setActionMessage(`Snapshot failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      setIsSubmitting(true);
      await recordProjectOutcome(selectedCandidate.id, outcomeForm);
      setModalMode(null);
      setSelectedCandidate(null);
      setActionMessage(`Recorded outcome ${outcomeForm.status} for ${selectedCandidate.name}`);
      await loadValidationData();
    } catch (err: any) {
      alert(`Failed to record outcome: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      setIsSubmitting(true);
      const res = await recordExternalDiscovery(selectedCandidate.id, {
        ...discoveryForm,
        discoveredAt: new Date(discoveryForm.discoveredAt).toISOString(),
      });
      setModalMode(null);
      setSelectedCandidate(null);
      setActionMessage(
        `External discovery recorded! Lead time: ${res.actualLeadTimeDays} days (${res.leadMessage})`,
      );
      await loadValidationData();
    } catch (err: any) {
      alert(`Failed to record external discovery: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      setIsSubmitting(true);
      await rejectCandidate(selectedCandidate.id, rejectForm);
      setModalMode(null);
      setSelectedCandidate(null);
      setActionMessage(
        `Candidate ${selectedCandidate.name} marked as REJECTED (${rejectForm.rejectionReason})`,
      );
      await loadValidationData();
    } catch (err: any) {
      alert(`Failed to reject candidate: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCandidates =
    data?.candidates.filter((c) => {
      if (filterType === 'BASELINE') return c.isBaseline;
      if (filterType === 'NEW') return !c.isBaseline;
      if (filterType === 'ACTIVE') return c.status !== 'REJECTED';
      if (filterType === 'REJECTED') return c.status === 'REJECTED' || c.rejectionReason;
      if (filterType === 'DISCOVERIES')
        return c.externalDiscoveriesCount > 0 || c.externalDiscoveryDate;
      return true;
    }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-mono">
      {/* Top Banner */}
      <div className="border-b-2 border-black dark:border-white/10 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#BFFF00] text-black border border-black flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> 30-DAY BLIND VALIDATION
                </span>
                <span className="text-xs text-muted-foreground">FROZEN BASELINE: 18 SEP 2026</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                VALIDATION & OBSERVATION SYSTEM
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                Rigorous empirical observation experiment. Measures whether Radar detects genuinely
                early Web3 protocols before external listing and tracks real development milestones.
              </p>
            </div>

            {/* Actions & Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/radar"
                className="px-4 py-2 bg-card border-2 border-black dark:border-white/20 text-xs font-bold rounded-xl hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Radar className="w-4 h-4 text-[#BFFF00]" /> Live Radar
              </Link>
              <button
                onClick={handleSnapshotRun}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#BFFF00] text-black font-bold text-xs rounded-xl border-2 border-black hover:bg-[#a6de00] transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                Run Daily Snapshot
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="mt-4 p-3 bg-[#BFFF00]/10 border border-[#BFFF00] rounded-xl text-xs flex items-center justify-between text-foreground">
              <span>{actionMessage}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          )}

          {/* Validation Metrics Grid */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-black/10 dark:border-white/10">
              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Baseline Candidates
                </span>
                <p className="text-2xl font-black mt-1 text-[#BFFF00]">{data.baselineCount}</p>
                <span className="text-[10px] text-muted-foreground">Frozen 18 Sep</span>
              </div>

              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">Total Tracked</span>
                <p className="text-2xl font-black mt-1">{data.totalCandidates}</p>
                <span className="text-[10px] text-muted-foreground">
                  +{data.newCandidates} post-baseline
                </span>
              </div>

              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Active Candidates
                </span>
                <p className="text-2xl font-black mt-1 text-emerald-400">{data.activeCandidates}</p>
                <span className="text-[10px] text-muted-foreground">
                  7d:{' '}
                  {data.activeAfter7Days !== null ? `${data.activeAfter7Days} active` : 'Pending'} •
                  30d:{' '}
                  {data.activeAfter30Days !== null ? `${data.activeAfter30Days} active` : 'Pending'}
                </span>
              </div>

              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Median Detection Lag
                </span>
                <p className="text-2xl font-black mt-1 text-cyan-400">
                  {data.medianDetectionLag !== null ? `${data.medianDetectionLag}d` : 'N/A'}
                </p>
                <span className="text-[10px] text-muted-foreground">Genesis → Radar</span>
              </div>

              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">
                  External Discoveries
                </span>
                <p className="text-2xl font-black mt-1">{data.externalDiscoveries}</p>
                <span className="text-[10px] text-muted-foreground">
                  {data.externalDiscoveries > 0
                    ? `+${data.positiveLeadTimes} lead / -${data.negativeLeadTimes} lag`
                    : 'Pending (0 events)'}
                </span>
              </div>

              <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase">
                  False Positive Rate
                </span>
                <p className="text-2xl font-black mt-1 text-rose-400">
                  {data.falsePositiveRate !== null ? `${data.falsePositiveRate}%` : '0%'}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {data.rejectedCandidates} rejected
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* External Discovery by Category Breakdown */}
        {data && (
          <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-[#BFFF00]" /> External Discovery Lead Time by Category
              Benchmark
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Measures which external medium Radar precedes earliest. Distinguishes project
              directories, airdrop trackers, crypto news, and major social accounts.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'PROJECT_DIRECTORY', label: 'Directory', desc: 'RootData / DeFiLlama' },
                {
                  id: 'AIRDROP_TRACKER',
                  label: 'Airdrop Tracker',
                  desc: 'CryptoRank / Airdrops.io',
                },
                { id: 'CRYPTO_NEWS', label: 'Crypto News', desc: 'CoinDesk / TheBlock' },
                { id: 'MAJOR_SOCIAL_ACCOUNT', label: 'Major Social', desc: 'Influencers / VCs' },
                { id: 'OFFICIAL_ANNOUNCEMENT', label: 'Announcement', desc: 'Protocol Launch' },
                { id: 'OTHER', label: 'Other Sources', desc: 'Community / Forums' },
              ].map((cat) => {
                const breakdown = data.externalDiscoveryCategoryBreakdown?.[cat.id];
                const count = breakdown?.count || 0;
                const median = breakdown?.medianLeadTime;
                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      {cat.label}
                    </span>
                    <p className="text-lg font-black">{count} events</p>
                    <span className="text-[10px] text-muted-foreground block">
                      {median !== null && median !== undefined
                        ? `Lead: ${median >= 0 ? `+${median}d` : `${median}d`}`
                        : 'Lead: Pending'}
                    </span>
                    <span className="text-[9px] text-muted-foreground block truncate">
                      {cat.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* X (Twitter) OAuth 2.0 Integration & Ingestion Console */}
        <XIntegrationCard />

        {/* Zero-Cost Multi-Source Discovery Feed & Manual Evidence Console */}
        <ZeroCostDiscoveryCard />

        {/* Source Precedence & Observed Sequences */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Precedence */}
            <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#BFFF00]" /> First Signal Source Distribution
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(data.firstSignalSourceDistribution).map(([src, count]) => (
                  <div
                    key={src}
                    className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      {src}
                    </span>
                    <p className="text-xl font-black mt-1">{count}</p>
                    <span className="text-[9px] text-muted-foreground">
                      {data.totalCandidates > 0
                        ? `${Math.round((count / data.totalCandidates) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observed Sequences */}
            <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#BFFF00]" /> Observed Precedence Sequences
              </h3>
              <div className="space-y-2">
                {Object.entries(data.signalSequenceDistribution).map(([seq, count]) => (
                  <div
                    key={seq}
                    className="flex items-center justify-between p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-xl text-xs"
                  >
                    <span className="font-bold">{seq}</span>
                    <span className="px-2 py-0.5 bg-[#BFFF00]/20 text-black dark:text-[#BFFF00] font-black rounded-md border border-black/10 dark:border-[#BFFF00]/30">
                      {count} candidates
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Candidate Audit Table Header & Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 p-1 bg-card border-2 border-black dark:border-white/10 rounded-xl">
            {(['ALL', 'BASELINE', 'NEW', 'ACTIVE', 'REJECTED', 'DISCOVERIES'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterType === tab
                      ? 'bg-[#BFFF00] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            Showing {filteredCandidates.length} of {data?.totalCandidates || 0} candidates
          </span>
        </div>

        {/* Candidates Table */}
        {isLoading ? (
          <div className="p-16 border-2 border-black dark:border-white/10 rounded-2xl bg-card text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#BFFF00]" />
            <p className="text-sm font-bold">Loading validation candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-16 border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl text-center space-y-3">
            <p className="text-base font-bold">No candidates found in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-black dark:border-white/10 rounded-2xl bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b-2 border-black dark:border-white/10 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Candidate Project</th>
                  <th className="p-3.5">T₀ Baseline (18 Sep)</th>
                  <th className="p-3.5">Current & Δ</th>
                  <th className="p-3.5">Detection Lag</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5">Actual Lead Time</th>
                  <th className="p-3.5">Latest Outcome</th>
                  <th className="p-3.5 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {filteredCandidates.map((cand) => {
                  return (
                    <tr key={cand.id} className="hover:bg-muted/30 transition-colors">
                      {/* Project Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${cand.slug}`}
                            className="font-bold text-sm hover:text-[#BFFF00] flex items-center gap-1"
                          >
                            {cand.name}{' '}
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                          {cand.isBaseline && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-black text-white dark:bg-white dark:text-black font-bold">
                              BASELINE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Detected {new Date(cand.firstRadarScanAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* T0 Baseline (18 Sep) */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Earlyness:</span>
                            <span className="font-bold text-cyan-400">
                              {cand.baselineEarlynessScore ?? cand.earlynessScore}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Signal:</span>
                            <span className="font-bold text-[#BFFF00]">
                              {cand.baselineSignalStrength ?? cand.signalStrength}/100
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground block">
                            {cand.baselineStage ?? cand.stage}
                          </span>
                        </div>
                      </td>

                      {/* Current & Delta */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{cand.signalStrength}/100</span>
                            {cand.signalDelta !== undefined && cand.signalDelta !== 0 && (
                              <span
                                className={`text-[10px] font-bold px-1 rounded ${cand.signalDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
                              >
                                {cand.signalDelta > 0
                                  ? `+${cand.signalDelta}`
                                  : `${cand.signalDelta}`}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Earlyness: {cand.earlynessScore}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-muted font-bold block w-fit">
                            {cand.stage}
                          </span>
                        </div>
                      </td>

                      {/* Detection Lag */}
                      <td className="p-3.5">
                        {cand.detectionLagDays !== null && cand.detectionLagDays !== undefined ? (
                          <div>
                            <span className="font-bold text-cyan-400">
                              {Math.round(cand.detectionLagDays * 10) / 10} days
                            </span>
                            <span className="block text-[9px] text-muted-foreground">
                              (Radar - Genesis)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not observed</span>
                        )}
                      </td>

                      {/* Verification Type */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          {cand.verificationType === 'CODE_VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit">
                              CODE & REPO
                            </span>
                          ) : cand.verificationType === 'CONTRACT_VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 w-fit">
                              ON-CHAIN CONTRACT
                            </span>
                          ) : cand.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 w-fit">
                              REJECTED: {cand.rejectionReason || 'OTHER'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-black/10 dark:border-white/10 w-fit">
                              UNVERIFIED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actual Lead Time */}
                      <td className="p-3.5">
                        {cand.actualLeadTimeDays !== null ? (
                          <div>
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                cand.actualLeadTimeDays >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {cand.actualLeadTimeDays >= 0 ? (
                                <>
                                  <TrendingUp className="w-3.5 h-3.5" /> +{cand.actualLeadTimeDays}d
                                  lead
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-3.5 h-3.5" /> {cand.actualLeadTimeDays}
                                  d lag
                                </>
                              )}
                            </span>
                            <span className="block text-[9px] text-muted-foreground">
                              {cand.latestExternalDiscovery?.source || 'Tracker listed'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pending discovery</span>
                        )}
                      </td>

                      {/* Precedence & Sequence */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-muted font-bold block w-fit">
                          {cand.sequenceLabel}
                        </span>
                        <span className="text-[9px] text-muted-foreground mt-0.5 block">
                          Src: {cand.precedenceSource}
                        </span>
                      </td>

                      {/* Latest Outcome */}
                      <td className="p-3.5">
                        {cand.latestOutcome ? (
                          <div>
                            <span className="font-bold text-[#BFFF00]">
                              {cand.latestOutcome.status}
                            </span>
                            <span className="block text-[9px] text-muted-foreground line-clamp-1">
                              {cand.latestOutcome.evidence}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No outcome yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setModalMode('OUTCOME');
                          }}
                          className="px-2.5 py-1 bg-muted hover:bg-[#BFFF00] hover:text-black font-bold rounded-lg border border-black/10 dark:border-white/10 transition-colors"
                          title="Record Outcome"
                        >
                          Outcome
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setModalMode('EXTERNAL_DISCOVERY');
                          }}
                          className="px-2.5 py-1 bg-muted hover:bg-cyan-400 hover:text-black font-bold rounded-lg border border-black/10 dark:border-white/10 transition-colors"
                          title="Record External Discovery"
                        >
                          External
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setModalMode('REJECT');
                          }}
                          className="px-2.5 py-1 bg-muted hover:bg-rose-500 hover:text-white font-bold rounded-lg border border-black/10 dark:border-white/10 transition-colors"
                          title="Reject Candidate"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 30-Day Blind Validation Report Document Card */}
        {data && (
          <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#BFFF00]" />
                <h3 className="text-base font-black">
                  UNIFYVAULT EARLY RADAR — 30-DAY VALIDATION REPORT
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">AUDIT-READY RESEARCH DATA</span>
            </div>

            <pre className="p-4 bg-background border border-black/10 dark:border-white/10 rounded-xl text-xs overflow-x-auto leading-relaxed text-foreground/90">
              {`================================================================================
UNIFYVAULT EARLY RADAR — 30-DAY VALIDATION REPORT
================================================================================
Baseline Date:                18 September 2026 (Immutable)
Total Candidates Observed:    ${data.totalCandidates}
  - Frozen Baseline:          ${data.baselineCount}
  - Post-Baseline Additions:  ${data.newCandidates}

Development Telemetry Status:
  - Fresh (<30d from Genesis): ${data.freshCandidates}
  - Currently Active:          ${data.activeCandidates}
  - Abandoned / Inactive:      ${data.abandonedCandidates}
  - Active After 7 Days:       ${data.activeAfter7Days}
  - Active After 14 Days:      ${data.activeAfter14Days}
  - Active After 30 Days:      ${data.activeAfter30Days}

Temporal Lead Time & Lag Metrics:
  - Median Detection Lag:      ${data.medianDetectionLag !== null ? `${data.medianDetectionLag} days (firstRadarScanAt - githubCreatedAt)` : 'Not enough data'}
  - External Discoveries:      ${data.externalDiscoveries} recorded events
  - Positive Lead Times:       ${data.positiveLeadTimes} (Radar preceded external tracker)
  - Negative Lead Times:       ${data.negativeLeadTimes} (External tracker preceded Radar)
  - Median Actual Lead Time:   ${data.medianLeadTime !== null ? `${data.medianLeadTime} days` : 'Insufficient external discovery events'}

First Signal Source Distribution:
${Object.entries(data.firstSignalSourceDistribution)
  .map(
    ([src, count]) =>
      `  - ${src.padEnd(14)}: ${count} (${data.totalCandidates > 0 ? Math.round((count / data.totalCandidates) * 100) : 0}%)`,
  )
  .join('\n')}

Observed Signal Sequences:
${Object.entries(data.signalSequenceDistribution)
  .map(([seq, count]) => `  - ${seq.padEnd(28)}: ${count}`)
  .join('\n')}

False-Positive & Rejection Audit:
  - Rejected Candidates:       ${data.rejectedCandidates}
  - False-Positive Rate:       ${data.falsePositiveRate !== null ? `${data.falsePositiveRate}%` : '0%'}
${
  Object.entries(data.rejectionReasonDistribution)
    .filter(([_, count]) => count > 0)
    .map(([reason, count]) => `    * ${reason}: ${count}`)
    .join('\n') || '    * No categorized rejections recorded'
}

Note: All timestamps, evidence links, and snapshots are immutable and auditable.
================================================================================`}
            </pre>
          </div>
        )}
      </div>

      {/* Modal Dialogs */}
      {modalMode && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-black dark:border-white/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm">
                {modalMode === 'OUTCOME' && `Record Outcome — ${selectedCandidate.name}`}
                {modalMode === 'EXTERNAL_DISCOVERY' &&
                  `Record External Discovery — ${selectedCandidate.name}`}
                {modalMode === 'REJECT' && `Reject Candidate — ${selectedCandidate.name}`}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Modal Forms */}
            {modalMode === 'OUTCOME' && (
              <form onSubmit={handleOutcomeSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Observed Outcome Status</label>
                  <select
                    value={outcomeForm.status}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, status: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  >
                    <option value="ACTIVE">ACTIVE (Ongoing dev commits)</option>
                    <option value="TESTNET">TESTNET (Live testnet deployed)</option>
                    <option value="MAINNET">MAINNET (Contracts deployed on mainnet)</option>
                    <option value="TOKEN_LAUNCHED">TOKEN_LAUNCHED (Official token)</option>
                    <option value="INCENTIVE_CONFIRMED">
                      INCENTIVE_CONFIRMED (Official points/rewards)
                    </option>
                    <option value="TRACKER_LISTED">TRACKER_LISTED (Listed on trackers)</option>
                    <option value="ABANDONED">ABANDONED (No commits / archived)</option>
                    <option value="NO_LONGER_ACTIVE">NO_LONGER_ACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">
                    Source (e.g. GitHub, BaseScan, Official Docs)
                  </label>
                  <input
                    type="text"
                    required
                    value={outcomeForm.source}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, source: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Source URL</label>
                  <input
                    type="url"
                    value={outcomeForm.sourceUrl}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, sourceUrl: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Verifiable Public Evidence</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specific commit hash, transaction hash, contract address, or official announcement excerpt..."
                    value={outcomeForm.evidence}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, evidence: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Auditor Notes (Optional)</label>
                  <input
                    type="text"
                    value={outcomeForm.notes}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#BFFF00] text-black font-bold rounded-lg border border-black"
                  >
                    Save Outcome
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'EXTERNAL_DISCOVERY' && (
              <form onSubmit={handleDiscoverySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">External Discovery Source</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RootData, CryptoRank, DefiLlama, AirdropAlert"
                    value={discoveryForm.source}
                    onChange={(e) => setDiscoveryForm({ ...discoveryForm, source: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Discovery Type</label>
                  <select
                    value={discoveryForm.discoveryType}
                    onChange={(e) =>
                      setDiscoveryForm({ ...discoveryForm, discoveryType: e.target.value })
                    }
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  >
                    <option value="PROJECT_DIRECTORY">
                      PROJECT_DIRECTORY (RootData, DefiLlama)
                    </option>
                    <option value="AIRDROP_TRACKER">
                      AIRDROP_TRACKER (CryptoRank, Airdrops.io)
                    </option>
                    <option value="CRYPTO_NEWS">CRYPTO_NEWS (CoinDesk, TheBlock)</option>
                    <option value="MAJOR_SOCIAL_ACCOUNT">
                      MAJOR_SOCIAL_ACCOUNT (Influencer/VC post)
                    </option>
                    <option value="OFFICIAL_ANNOUNCEMENT">OFFICIAL_ANNOUNCEMENT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Discovered Timestamp</label>
                  <input
                    type="date"
                    required
                    value={discoveryForm.discoveredAt}
                    onChange={(e) =>
                      setDiscoveryForm({ ...discoveryForm, discoveredAt: e.target.value })
                    }
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Listing URL</label>
                  <input
                    type="url"
                    value={discoveryForm.sourceUrl}
                    onChange={(e) =>
                      setDiscoveryForm({ ...discoveryForm, sourceUrl: e.target.value })
                    }
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Listing Evidence</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe listing timestamp and evidence on external tracker..."
                    value={discoveryForm.evidence}
                    onChange={(e) =>
                      setDiscoveryForm({ ...discoveryForm, evidence: e.target.value })
                    }
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-cyan-400 text-black font-bold rounded-lg border border-black"
                  >
                    Record Discovery
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'REJECT' && (
              <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Rejection Reason</label>
                  <select
                    value={rejectForm.rejectionReason}
                    onChange={(e) =>
                      setRejectForm({ ...rejectForm, rejectionReason: e.target.value })
                    }
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  >
                    <option value="TUTORIAL">TUTORIAL (Tutorial, educational sample)</option>
                    <option value="HOMEWORK">HOMEWORK (Bootcamp / assignment submission)</option>
                    <option value="FORK">FORK (Direct fork without modifications)</option>
                    <option value="DORMANT">DORMANT (No meaningful activity)</option>
                    <option value="DUPLICATE">
                      DUPLICATE (Already tracked under another repo)
                    </option>
                    <option value="NON_WEB3">NON_WEB3 (Not related to Web3/crypto)</option>
                    <option value="NO_MEANINGFUL_ACTIVITY">NO_MEANINGFUL_ACTIVITY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Rejection Notes / Audit Rationale</label>
                  <textarea
                    rows={3}
                    placeholder="Explanation for audit record..."
                    value={rejectForm.notes}
                    onChange={(e) => setRejectForm({ ...rejectForm, notes: e.target.value })}
                    className="w-full p-2 bg-background border border-black/20 dark:border-white/20 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-500 text-white font-bold rounded-lg border border-black"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
