'use client';

import React, { useState, useEffect } from 'react';
import {
  CorrelatedDiscoveryItem,
  fetchCorrelatedDiscoveryFeed,
  submitManualXEvidence,
  runDeepInvestigation,
} from '@/lib/radar/radarApi';

export function ZeroCostDiscoveryCard() {
  const [feed, setFeed] = useState<CorrelatedDiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Deep Investigation State
  const [selectedInvestigation, setSelectedInvestigation] = useState<any | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'graph' | 'report'>('matrix');

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await fetchCorrelatedDiscoveryFeed(20);
      setFeed(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitManualXEvidence({
        url: url.trim(),
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        evidenceText: evidenceText.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Evidence submitted for project "${res.projectName}". Corroborated sources: ${res.corroboratedSources.join(', ')}.`,
      });
      setUrl('');
      setPublishedAt('');
      setEvidenceText('');
      loadFeed();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit evidence',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeepInvestigation = async (item: CorrelatedDiscoveryItem) => {
    setInvestigating(true);
    try {
      const report = await runDeepInvestigation({
        projectId: item.projectId,
        githubUrl: item.sourceUrl?.includes('github.com') ? item.sourceUrl : undefined,
        xUrl:
          item.sourceUrl?.includes('x.com') || item.sourceUrl?.includes('twitter.com')
            ? item.sourceUrl
            : undefined,
        authorName: item.projectName,
      });
      setSelectedInvestigation(report);
    } catch (err: any) {
      alert(`Investigation failed: ${err.message}`);
    } finally {
      setInvestigating(false);
    }
  };

  return (
    <div className="bg-[#0b101b] border border-cyan-500/20 rounded-xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Zero-Cost Multi-Source Discovery
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              100% Free / No Paid API
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated public GitHub discovery correlated with manual X evidence, public website
            inspection, and smart contracts.
          </p>
        </div>
        <button
          onClick={loadFeed}
          disabled={loading}
          className="text-xs font-mono px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition flex items-center gap-1.5 self-start md:self-auto"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Feed'}
        </button>
      </div>

      {/* Manual X Evidence Submission Form */}
      <div className="bg-[#111827]/80 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="text-cyan-400">⊕</span> Add Manual X (Twitter) Evidence
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            Collection Mode: <strong className="text-amber-400">MANUAL</strong>
          </span>
        </div>

        {feedback && (
          <div
            className={`text-xs p-3 rounded border font-mono ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <input
              type="url"
              placeholder="https://x.com/username/status/1234567890..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <div>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Evidence summary / technical context (e.g. repo links, contracts)..."
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-lg transition shadow-md shadow-cyan-900/30"
            >
              {submitting ? 'Investigating...' : 'Submit & Investigate'}
            </button>
          </div>
        </form>
      </div>

      {/* Correlated Discovery Feed Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Multi-Source Correlated Discovery Stream ({feed.length})
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            Cohort B Candidates & Baseline Cross-References
          </span>
        </div>

        {loading && feed.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            Loading correlated discovery stream...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2 px-3">Candidate / Entity</th>
                  <th className="py-2 px-3">Primary Source</th>
                  <th className="py-2 px-3">Mode</th>
                  <th className="py-2 px-3">Corroboration</th>
                  <th className="py-2 px-3">Technical Artifacts</th>
                  <th className="py-2 px-3">Cohort</th>
                  <th className="py-2 px-3 text-right">Investigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {feed.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{item.projectName}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{item.source}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.collectionMode === 'CORROBORATED'
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                            : item.collectionMode === 'AUTOMATED'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.collectionMode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 space-x-1">
                      {item.githubCorroboration && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          GitHub
                        </span>
                      )}
                      {item.xCorroboration && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30">
                          X
                        </span>
                      )}
                      {item.contractCorroboration && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                          Contract
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {item.technicalArtifact.technicalMatches.length > 0
                        ? item.technicalArtifact.technicalMatches.slice(0, 3).join(', ')
                        : 'Genesis repository'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.cohort === 'COHORT_A_FROZEN'
                            ? 'bg-indigo-950/50 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {item.cohort === 'COHORT_A_FROZEN' ? 'Cohort A (Frozen)' : 'Cohort B'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeepInvestigation(item)}
                        disabled={investigating}
                        className="text-[10px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded transition"
                      >
                        🔍 Full Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Investigation Report Modal / Drawer */}
      {selectedInvestigation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101b] border-2 border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0e1526]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedInvestigation.entityIdentification.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    {selectedInvestigation.entityIdentification.entityType}
                  </span>
                  {selectedInvestigation.entityIdentification.isPersonOrKOL && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                      PERSON / COMMENTATOR
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Verdict:{' '}
                  <strong className="text-cyan-300">
                    {selectedInvestigation.earlynessVsSignalRating.verdict}
                  </strong>{' '}
                  (Earlyness: {selectedInvestigation.earlynessVsSignalRating.earlynessScore}/100 |
                  Signal Strength: {selectedInvestigation.earlynessVsSignalRating.signalStrength}
                  /100)
                </p>
              </div>
              <button
                onClick={() => setSelectedInvestigation(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg border border-slate-700 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-[#080d1a] px-6 gap-2 pt-2">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`text-xs font-mono py-2 px-4 rounded-t-lg border-t border-x transition ${
                  activeTab === 'matrix'
                    ? 'border-cyan-500 bg-[#0b101b] text-cyan-300 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 9-Category Evidence Matrix
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`text-xs font-mono py-2 px-4 rounded-t-lg border-t border-x transition ${
                  activeTab === 'graph'
                    ? 'border-cyan-500 bg-[#0b101b] text-cyan-300 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🔗 Corroboration Graph
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`text-xs font-mono py-2 px-4 rounded-t-lg border-t border-x transition ${
                  activeTab === 'report'
                    ? 'border-cyan-500 bg-[#0b101b] text-cyan-300 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 15-Section Research Report
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 font-mono">
              {activeTab === 'matrix' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(selectedInvestigation.evidenceMatrix).map(
                      ([catKey, catVal]: [string, any]) => {
                        if (catKey === 'totalSignalStrength') return null;
                        return (
                          <div
                            key={catKey}
                            className="bg-[#111827] border border-slate-800 rounded-lg p-3 space-y-1.5"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-200 uppercase">
                                {catKey}
                              </span>
                              <span className="text-[11px] font-bold text-cyan-400">
                                {catVal.score}/{catVal.maxScore}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2">
                              {catVal.evidence}
                            </p>
                            {catVal.missingReason && (
                              <p className="text-[9px] text-amber-400/80">
                                ⚠️ {catVal.missingReason}
                              </p>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Missing Evidence & Red Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">
                        Missing Evidence
                      </span>
                      <ul className="list-disc list-inside text-[10px] text-amber-200/80">
                        {selectedInvestigation.missingEvidence.length > 0 ? (
                          selectedInvestigation.missingEvidence.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                          ))
                        ) : (
                          <li>All primary technical evidence artifacts verified.</li>
                        )}
                      </ul>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-rose-400 uppercase">
                        Red Flags
                      </span>
                      <ul className="list-disc list-inside text-[10px] text-rose-200/80">
                        {selectedInvestigation.redFlags.length > 0 ? (
                          selectedInvestigation.redFlags.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))
                        ) : (
                          <li>No active red flags detected in public artifacts.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'graph' && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white uppercase">
                      Corroboration Pipeline
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                      Mode: {selectedInvestigation.crossSourceCorroboration.mode}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedInvestigation.crossSourceCorroboration.nodes.map(
                      (node: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded bg-[#080d1a] border border-slate-800"
                        >
                          <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="text-cyan-400 text-[11px]">{node.source}</strong>
                              <span className="text-slate-400 text-[10px]">{node.details}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{node.url}</p>
                          </div>
                          <span className="text-[10px] text-emerald-400">✓ Verified</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'report' && (
                <div className="space-y-4 bg-[#111827] p-5 rounded-xl border border-slate-800 text-[11px] leading-relaxed">
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase mb-1">
                      1. Entity Identification
                    </h4>
                    <p className="text-slate-400">
                      Name: {selectedInvestigation.entityIdentification.name} | Type:{' '}
                      {selectedInvestigation.entityIdentification.entityType} | Identity:{' '}
                      {selectedInvestigation.entityIdentification.officialIdentity}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase mb-1">
                      2. Technical Architecture & Artifacts
                    </h4>
                    <p className="text-slate-400">{selectedInvestigation.technicalArchitecture}</p>
                    <p className="text-slate-400">
                      Languages:{' '}
                      {selectedInvestigation.githubAnalysis.languages.join(', ') || 'N/A'} | Smart
                      Contracts:{' '}
                      {selectedInvestigation.githubAnalysis.hasSmartContracts ? 'YES' : 'NO'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase mb-1">
                      3. On-Chain Deployment Evidence
                    </h4>
                    <p className="text-slate-400">{selectedInvestigation.onChainAnalysis.notes}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase mb-1">
                      4. Recommended Next Action
                    </h4>
                    <p className="text-cyan-300">
                      {selectedInvestigation.recommendedNextInvestigationStep}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
