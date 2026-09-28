'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar,
  Search,
  Sparkles,
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
  SlidersHorizontal,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { fetchProjects, triggerGitHubDiscovery, Project } from '../../lib/radar/radarApi';

export default function EarlyRadarDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<'score' | 'detected' | 'name'>('score');
  const [discoveryQuery, setDiscoveryQuery] = useState('solidity testnet language:solidity');
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjects({
        stage: selectedStage === 'ALL' ? undefined : selectedStage,
        search: search.trim() || undefined,
        sort: sortOption,
      });
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [selectedStage, sortOption]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProjects();
  };

  const handleRunDiscovery = async () => {
    try {
      setIsDiscovering(true);
      setDiscoveryStatus('Running real GitHub telemetry & signal extraction...');
      const res = await triggerGitHubDiscovery(discoveryQuery, 6);
      setDiscoveryStatus(
        `Discovered ${res.discoveredCount} candidates (${res.newProjectsCount} new, ${res.updatedProjectsCount} updated).`,
      );
      await loadProjects();
    } catch (err: any) {
      setDiscoveryStatus(`Discovery failed: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const highSignalProjects = projects.filter((p) => (p.latestScore?.totalScore || 0) >= 20);
  const recentDetections = [...projects]
    .sort((a, b) => new Date(b.firstDetectedAt).getTime() - new Date(a.firstDetectedAt).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Header Banner */}
      <div className="border-b-2 border-black dark:border-white/10 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#BFFF00] text-black border border-black flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5 animate-pulse" /> LIVE TELEMETRY
                </span>
                <span className="text-xs font-mono text-muted-foreground">REAL PUBLIC SIGNALS</span>
                <Link
                  href="/radar/validation"
                  className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-muted hover:bg-[#BFFF00] hover:text-black text-foreground border border-black/20 dark:border-white/20 transition-colors flex items-center gap-1 ml-2"
                >
                  <Compass className="w-3.5 h-3.5" /> 30-Day Validation
                </Link>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
                UNIFYVAULT EARLY RADAR
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl font-mono">
                Autonomous Web3 early-project discovery engine. Surfaces pre-listing repositories,
                contract telemetry, and developer activity before mainstream listings.
              </p>
            </div>

            {/* Quick Trigger Discovery Engine */}
            <div className="flex flex-col gap-2 p-4 bg-background border-2 border-black dark:border-white/10 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
              <span className="text-xs font-bold font-mono text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#BFFF00]" /> TRIGGER DISCOVERY SCAN
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discoveryQuery}
                  onChange={(e) => setDiscoveryQuery(e.target.value)}
                  placeholder="e.g. solidity testnet language:solidity"
                  className="px-3 py-1.5 text-xs font-mono bg-card border border-black dark:border-white/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
                />
                <button
                  onClick={handleRunDiscovery}
                  disabled={isDiscovering}
                  className="px-4 py-1.5 bg-[#BFFF00] text-black font-mono font-bold text-xs rounded-lg border border-black hover:bg-[#a6de00] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                  {isDiscovering ? 'Scanning...' : 'Discover'}
                </button>
              </div>
              {discoveryStatus && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {discoveryStatus}
                </span>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-black/10 dark:border-white/10">
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">TRACKED CANDIDATES</span>
              <p className="text-2xl font-mono font-black mt-1">{projects.length}</p>
            </div>
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">
                HIGH SIGNAL ({'>='}20/100)
              </span>
              <p className="text-2xl font-mono font-black mt-1 text-[#BFFF00]">
                {highSignalProjects.length}
              </p>
            </div>
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">TESTNET DETECTIONS</span>
              <p className="text-2xl font-mono font-black mt-1">
                {projects.filter((p) => p.stage === 'TESTNET').length}
              </p>
            </div>
            <div className="p-3 bg-background border border-black/10 dark:border-white/10 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">VERIFIED PROTOCOLS</span>
              <p className="text-2xl font-mono font-black mt-1 text-emerald-500">
                {projects.filter((p) => p.status === 'VERIFIED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Stage Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-card border-2 border-black dark:border-white/10 rounded-xl">
            {['ALL', 'DISCOVERED', 'EARLY', 'TESTNET', 'WATCH', 'VERIFIED'].map((stage) => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedStage === stage
                    ? 'bg-[#BFFF00] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, slug, tech..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-card border-2 border-black dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              />
            </form>

            <select
              value={sortOption}
              onChange={(e: any) => setSortOption(e.target.value)}
              className="px-3 py-2 text-xs font-mono bg-card border-2 border-black dark:border-white/10 rounded-xl focus:outline-none"
            >
              <option value="score">Sort: Highest Signal</option>
              <option value="detected">Sort: Recently Detected</option>
              <option value="name">Sort: Alphabetical</option>
            </select>

            <button
              onClick={loadProjects}
              className="p-2 bg-card border-2 border-black dark:border-white/10 rounded-xl hover:bg-muted"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="p-16 border-2 border-black dark:border-white/10 rounded-2xl bg-card text-center flex flex-col items-center justify-center gap-3 font-mono">
            <RefreshCw className="w-8 h-8 animate-spin text-[#BFFF00]" />
            <p className="text-sm font-bold">Scanning early signals telemetry...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-16 border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl text-center space-y-3 font-mono">
            <Radar className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-base font-bold">No candidate projects matched this filter.</p>
            <p className="text-xs text-muted-foreground">
              Click &quot;Discover&quot; above to initiate a live GitHub search for active Web3
              repositories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const score = project.latestScore?.totalScore || 0;
              const devScore = project.latestScore?.developmentScore || 0;
              const onchainScore = project.latestScore?.onchainScore || 0;
              const commScore = project.latestScore?.communityScore || 0;

              return (
                <div
                  key={project.id}
                  className="bg-card border-2 border-black dark:border-white/10 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between hover:translate-y-[-2px] transition-transform"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#BFFF00]/20 text-black dark:text-[#BFFF00] border border-black/20 dark:border-[#BFFF00]/30">
                        {project.stage}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {project.verificationType === 'CODE_VERIFIED' ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> CODE VERIFIED
                          </span>
                        ) : project.status === 'VERIFIED' ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : null}
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(project.firstDetectedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-xl font-bold font-mono tracking-tight group-hover:text-[#BFFF00]">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 font-mono min-h-[32px]">
                      {project.description ||
                        'No public summary provided. Evaluated via repository code and commit telemetry.'}
                    </p>

                    {/* Dual Metrics: EARLYNESS vs SIGNAL STRENGTH (with T0 Baseline comparison) */}
                    <div className="mt-4 grid grid-cols-2 gap-2 font-mono">
                      {/* Earlyness metric */}
                      <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-cyan-400">EARLYNESS</span>
                          <span className="font-black text-cyan-400">
                            {project.earlynessScore ?? 50}/100
                          </span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5, project.earlynessScore ?? 50))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-0.5">
                          <span>
                            Lag:{' '}
                            {project.detectionLagDays !== null &&
                            project.detectionLagDays !== undefined
                              ? `${Math.round(project.detectionLagDays * 10) / 10}d`
                              : 'N/A'}
                          </span>
                          <span className="text-cyan-300">
                            T₀: {project.baselineEarlynessScore ?? project.earlynessScore ?? 50}
                          </span>
                        </div>
                      </div>

                      {/* Signal Strength metric */}
                      <div className="p-2.5 bg-background border border-black/10 dark:border-white/10 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#BFFF00]">SIGNAL</span>
                          <div className="flex items-center gap-1">
                            <span className="font-black text-[#BFFF00]">{score}/100</span>
                            {project.baselineSignalStrength !== undefined &&
                              score !== project.baselineSignalStrength && (
                                <span
                                  className={`text-[9px] font-bold ${score > (project.baselineSignalStrength || 0) ? 'text-emerald-400' : 'text-rose-400'}`}
                                >
                                  {score > (project.baselineSignalStrength || 0)
                                    ? `+${score - (project.baselineSignalStrength || 0)}`
                                    : `${score - (project.baselineSignalStrength || 0)}`}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#BFFF00] h-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-0.5">
                          <span>Dev: {devScore}/25</span>
                          <span className="text-[#BFFF00]">
                            T₀: {project.baselineSignalStrength ?? score}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Latest Detected Signal */}
                    {project.signals && project.signals.length > 0 && (
                      <div className="mt-3 p-2.5 bg-muted/40 rounded-lg border border-black/5 dark:border-white/5 font-mono">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#BFFF00]" /> LATEST SIGNAL
                        </span>
                        <p className="text-xs font-semibold mt-0.5 line-clamp-1">
                          {project.signals[0].title}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer CTAs */}
                  <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="View GitHub Repository"
                        >
                          <GitBranch className="w-4 h-4" />
                        </a>
                      )}
                      {project.websiteUrl && (
                        <a
                          href={project.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="View Official Portal"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <Link
                      href={`/projects/${project.slug}`}
                      className="px-3.5 py-1.5 bg-foreground text-background dark:bg-white dark:text-black font-mono font-bold text-xs rounded-lg hover:bg-[#BFFF00] hover:text-black transition-colors flex items-center gap-1"
                    >
                      Research & Evidence <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
