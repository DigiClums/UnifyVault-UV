'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Radar,
  GitBranch,
  Globe,
  FileText,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import {
  fetchProjectBySlug,
  verifyProjectStatus,
  recalculateProjectScore,
  Project,
} from '../../../lib/radar/radarApi';

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'evidence' | 'timeline' | 'report' | 'score-breakdown' | 'validation'
  >('evidence');

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjectBySlug(slug);
      setProject(data);
    } catch (err: any) {
      console.error('Failed to load project details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadProject();
    }
  }, [slug]);

  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    try {
      setIsVerifying(true);
      await verifyProjectStatus(slug, status, undefined, `Manual analyst review: ${status}`);
      setVerifyStatus(`Project marked as ${status}.`);
      await loadProject();
    } catch (err: any) {
      setVerifyStatus(`Action failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setIsVerifying(true);
      await recalculateProjectScore(slug);
      setVerifyStatus('Score recalculated successfully.');
      await loadProject();
    } catch (err: any) {
      setVerifyStatus(`Score calculation failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#BFFF00]" />
        <p className="text-sm font-bold">Loading research dossier for {slug}...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-8 font-mono text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Project Not Found</h2>
        <p className="text-xs text-muted-foreground">Unable to find candidate project: {slug}</p>
        <Link
          href="/radar"
          className="inline-block px-4 py-2 bg-[#BFFF00] text-black font-bold rounded-lg"
        >
          Back to Radar
        </Link>
      </div>
    );
  }

  const latestScore = project.scores?.[0] || project.latestScore;
  const latestReport = project.researchReports?.[0];
  const repo = project.githubRepository;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-mono">
      {/* Top Navigation */}
      <div className="border-b-2 border-black dark:border-white/10 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/radar"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Early Radar
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#BFFF00] text-black border border-black">
                  {project.stage}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    project.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                      : 'bg-muted text-muted-foreground border-black/20 dark:border-white/20'
                  }`}
                >
                  {project.status}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> First Detected:{' '}
                  {new Date(project.firstDetectedAt).toLocaleDateString('en-GB')}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                {project.description ||
                  'Public Web3 candidate discovered via GitHub telemetry and smart contract analysis.'}
              </p>
            </div>

            {/* Quick Actions & Verification Console */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-background border-2 border-black dark:border-white/10 rounded-xl">
              <button
                onClick={() => handleVerify('VERIFIED')}
                disabled={isVerifying}
                className="px-3 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-lg hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Project
              </button>
              <button
                onClick={() => handleVerify('REJECTED')}
                disabled={isVerifying}
                className="px-3 py-1.5 bg-rose-500 text-white font-bold text-xs rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-1"
              >
                Reject Candidate
              </button>
              <button
                onClick={handleRecalculate}
                disabled={isVerifying}
                className="px-3 py-1.5 bg-muted text-foreground font-bold text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-card transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />{' '}
                Recalculate
              </button>
            </div>
          </div>

          {verifyStatus && <p className="text-xs text-[#BFFF00] mt-3">{verifyStatus}</p>}

          {/* Links Row */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-black/10 dark:border-white/10 text-xs">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#BFFF00]" /> GitHub Repository{' '}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.websiteUrl && (
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <Globe className="w-3.5 h-3.5 text-[#BFFF00]" /> Official Website{' '}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.docsUrl && (
              <a
                href={project.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <FileText className="w-3.5 h-3.5 text-[#BFFF00]" /> Documentation{' '}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Dossier Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs bar */}
          <div className="flex flex-wrap gap-2 p-1 bg-card border-2 border-black dark:border-white/10 rounded-xl">
            {[
              { id: 'evidence', label: 'Observed Signals & Evidence', icon: Activity },
              { id: 'timeline', label: 'Historical Timeline', icon: Clock },
              { id: 'validation', label: '30-Day Validation & Outcomes', icon: ShieldCheck },
              { id: 'report', label: 'Research Report', icon: FileText },
              { id: 'score-breakdown', label: 'Score Rationale', icon: Sliders },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#BFFF00] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Evidence */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-muted-foreground">
                Detected Telemetry ({project.signals?.length || 0} Signals)
              </h3>
              {!project.signals || project.signals.length === 0 ? (
                <div className="p-8 bg-card border-2 border-dashed border-black/20 dark:border-white/20 rounded-xl text-center text-xs text-muted-foreground">
                  No signals recorded yet.
                </div>
              ) : (
                project.signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="p-4 bg-card border-2 border-black dark:border-white/10 rounded-xl space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted text-foreground border border-black/10 dark:border-white/10">
                        {signal.type}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(signal.detectedAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold">{signal.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {signal.evidence}
                    </p>
                    {signal.sourceUrl && (
                      <div className="pt-2">
                        <a
                          href={signal.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#BFFF00] hover:underline flex items-center gap-1"
                        >
                          Verify Primary Source <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Validation & Outcomes */}
          {activeTab === 'validation' && (
            <div className="space-y-6">
              {/* Outcomes Section */}
              <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-[#BFFF00] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Observed Project Outcomes (
                    {project.outcomes?.length || 0})
                  </h4>
                  <Link
                    href="/radar/validation"
                    className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                  >
                    Validation Console <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                {!project.outcomes || project.outcomes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No outcome recorded yet for this project.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {project.outcomes.map((out) => (
                      <div
                        key={out.id}
                        className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#BFFF00]">{out.status}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(out.observedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{out.evidence}</p>
                        {out.sourceUrl && (
                          <a
                            href={out.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline block"
                          >
                            Source: {out.source}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* External Discovery Events */}
              <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> External Discovery Listings (
                  {project.externalDiscoveries?.length || 0})
                </h4>

                {!project.externalDiscoveries || project.externalDiscoveries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No external tracker discovery event recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {project.externalDiscoveries.map((disc) => (
                      <div
                        key={disc.id}
                        className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-400">
                            {disc.source} ({disc.discoveryType})
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(disc.discoveredAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{disc.evidence}</p>
                        {disc.sourceUrl && (
                          <a
                            href={disc.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#BFFF00] hover:underline block"
                          >
                            View Listing <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily Snapshots */}
              <div className="p-5 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#BFFF00]" /> Daily Telemetry Snapshots (
                  {project.snapshots?.length || 0})
                </h4>
                {!project.snapshots || project.snapshots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No historical daily snapshots yet. Snapshots run automatically every 24h.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {project.snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="flex items-center justify-between p-2 bg-background border border-black/10 dark:border-white/10 rounded-lg text-xs"
                      >
                        <span className="text-muted-foreground">
                          {new Date(snap.snapshotDate).toLocaleDateString()}
                        </span>
                        <span className="font-bold">Score: {snap.signalStrength}/100</span>
                        <span className="text-muted-foreground">
                          Stars: {snap.githubStars} | Commits: {snap.recentCommits}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
                          {snap.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Timeline & Signal Sequence */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Automated Signal Sequence Flow */}
              <div className="p-4 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#BFFF00] block">
                  AUTOMATED SIGNAL SEQUENCE
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {project.timelineEvents && project.timelineEvents.length > 0 ? (
                    [...project.timelineEvents].reverse().map((ev, idx, arr) => (
                      <React.Fragment key={ev.id}>
                        <span className="px-2.5 py-1 rounded-md bg-muted text-foreground border border-black/10 dark:border-white/10 font-bold">
                          {ev.eventType}
                        </span>
                        {idx < arr.length - 1 && (
                          <span className="text-muted-foreground font-bold">➔</span>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Initial discovery sequence pending.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">
                  Detection Milestones & Cross-Source Precedence
                </h3>
                <div className="space-y-4 border-l-2 border-[#BFFF00] ml-3 pl-4">
                  {project.timelineEvents?.map((event) => (
                    <div key={event.id} className="relative space-y-1">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 bg-[#BFFF00] rounded-full border border-black" />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(event.eventDate).toLocaleDateString('en-GB')} • {event.eventType}
                      </span>
                      <h4 className="text-sm font-bold">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      {event.sourceUrl && (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#BFFF00] hover:underline inline-flex items-center gap-1"
                        >
                          Evidence Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Research Report */}
          {activeTab === 'report' && (
            <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#BFFF00]">INTELLIGENCE REPORT</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated by Deterministic Anti-Hallucination Intelligence Module.
                </p>
              </div>

              {latestReport ? (
                <div className="space-y-6 text-xs leading-relaxed">
                  <div className="p-3.5 bg-background border border-black/10 dark:border-white/10 rounded-xl">
                    <span className="font-bold text-muted-foreground block mb-1">
                      EXECUTIVE SUMMARY
                    </span>
                    <p>{latestReport.summary}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-emerald-500 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> CONFIRMED FACTS
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {latestReport.confirmedFacts.map((fact, i) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-amber-500 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> UNCONFIRMED CLAIMS & PENDING AUDITS
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {latestReport.unconfirmedClaims.map((claim, i) => (
                        <li key={i}>{claim}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-rose-500 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> OBSERVED RISKS
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {latestReport.risks.map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-cyan-500 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" /> SUGGESTED RESEARCH ACTIONS
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {latestReport.suggestedResearchActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No research report generated yet.</p>
              )}
            </div>
          )}

          {/* Tab 4: Score Rationale */}
          {activeTab === 'score-breakdown' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-muted-foreground">
                Mathematical Rationale for Score: {latestScore?.totalScore || 0}/100
              </h3>
              {latestScore?.explanations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(latestScore.explanations).map(
                    ([category, items]: [string, any]) => (
                      <div
                        key={category}
                        className="p-4 bg-card border-2 border-black dark:border-white/10 rounded-xl space-y-2"
                      >
                        <h4 className="text-xs font-bold uppercase text-[#BFFF00]">{category}</h4>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                          {Array.isArray(items) &&
                            items.map((desc: string, i: number) => <li key={i}>{desc}</li>)}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Metrics & 'Why Did Radar Find This?' */}
        <div className="space-y-6">
          {/* Dual Metrics Score Card */}
          <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <span className="text-[10px] font-bold uppercase text-cyan-400">EARLYNESS</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-cyan-400">
                    {project.earlynessScore ?? 50}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Lag:{' '}
                  {project.detectionLagDays ? `${Math.round(project.detectionLagDays)}d` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#BFFF00]">
                  SIGNAL STRENGTH
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-[#BFFF00]">
                    {latestScore?.totalScore || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Evidence score
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Development</span>
                <span className="font-bold">{latestScore?.developmentScore || 0} / 25</span>
              </div>
              <div className="flex justify-between">
                <span>On-Chain Activity</span>
                <span className="font-bold">{latestScore?.onchainScore || 0} / 25</span>
              </div>
              <div className="flex justify-between">
                <span>Community Interest</span>
                <span className="font-bold">{latestScore?.communityScore || 0} / 15</span>
              </div>
              <div className="flex justify-between">
                <span>Funding / Grants</span>
                <span className="font-bold">{latestScore?.fundingScore || 0} / 15</span>
              </div>
              <div className="flex justify-between">
                <span>Product & Docs</span>
                <span className="font-bold">{latestScore?.productScore || 0} / 10</span>
              </div>
              <div className="flex justify-between">
                <span>Incentives</span>
                <span className="font-bold">{latestScore?.incentiveScore || 0} / 10</span>
              </div>
            </div>
          </div>

          {/* Temporal Validation Metrics Card */}
          <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#BFFF00]" /> Temporal Audit & Lead Time
            </h4>

            {/* Detection Lag */}
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">
                DETECTION LAG
              </span>
              <p className="text-sm font-bold">
                {project.detectionLagDays !== null && project.detectionLagDays !== undefined
                  ? `Detection lag: ${Math.round(project.detectionLagDays * 10) / 10} days`
                  : 'Genesis timestamp not observed'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Measures how long after GitHub genesis Radar detected the repository.
              </p>
            </div>

            {/* Actual Lead Time */}
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                ACTUAL LEAD TIME
              </span>
              {project.actualLeadTimeDays !== null && project.actualLeadTimeDays !== undefined ? (
                <div>
                  <p
                    className={`text-sm font-bold ${project.actualLeadTimeDays >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {project.actualLeadTimeDays >= 0
                      ? `Radar detected this ${project.actualLeadTimeDays} days before external discovery.`
                      : `Radar detected this ${Math.abs(project.actualLeadTimeDays)} days after external discovery.`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    External Source: {project.externalDiscoveries?.[0]?.source || 'Tracker Listing'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pending external tracker listing. Record an external event via Validation Console
                  when observed.
                </p>
              )}
            </div>
          </div>

          {/* Killer Feature: 'Why did Radar find this?' */}
          <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-[#BFFF00]" /> Why Did Radar Find This?
            </h4>

            {/* Detected Because */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-500 block">
                DETECTED BECAUSE:
              </span>
              <ul className="space-y-1 text-xs">
                {(project.whyDetected && project.whyDetected.length > 0
                  ? project.whyDetected
                  : ['Repository discovered via automated GitHub telemetry scan']
                ).map((reason, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Not Detected Because */}
            <div className="space-y-1.5 pt-3 border-t border-black/10 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                NOT DETECTED BECAUSE OF:
              </span>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(project.whyNotDetected && project.whyNotDetected.length > 0
                  ? project.whyNotDetected
                  : [
                      'No token announcement',
                      'No airdrop announcement',
                      'No paid marketing campaign',
                    ]
                ).map((neg, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0">✗</span>
                    <span>{neg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* GitHub Telemetry Card */}
          {repo && (
            <div className="p-6 bg-card border-2 border-black dark:border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-[#BFFF00]" /> GitHub Telemetry
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-lg">
                  <span className="text-muted-foreground text-[10px]">STARS</span>
                  <p className="text-lg font-black mt-0.5">{repo.stars}</p>
                </div>
                <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-lg">
                  <span className="text-muted-foreground text-[10px]">RECENT COMMITS</span>
                  <p className="text-lg font-black mt-0.5">{repo.recentCommits}</p>
                </div>
                <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-lg">
                  <span className="text-muted-foreground text-[10px]">CONTRIBUTORS</span>
                  <p className="text-lg font-black mt-0.5">{repo.contributors}</p>
                </div>
                <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-lg">
                  <span className="text-muted-foreground text-[10px]">LANGUAGE</span>
                  <p className="text-sm font-black mt-1 text-[#BFFF00]">{repo.language || 'N/A'}</p>
                </div>
              </div>

              {repo.topics && repo.topics.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1.5">
                    TOPICS & TAGS
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {repo.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] bg-muted border border-black/10 dark:border-white/10"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
