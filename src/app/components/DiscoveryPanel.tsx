'use client';

import React, { useState } from 'react';
import { VALID_NICHES } from '@/types';

interface DiscoveryPanelProps {
  onDiscoveryComplete: () => void;
}

export default function DiscoveryPanel({ onDiscoveryComplete }: DiscoveryPanelProps) {
  const [selectedOption, setSelectedOption] = useState('Fashion');
  const [customNiche, setCustomNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState({ total: 0, current: 0 });
  const [newlySaved, setNewlySaved] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ saved: number; skipped: number; errors: number } | null>(null);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNiche = selectedOption === 'Other' ? customNiche : selectedOption;
    if (!finalNiche.trim()) return;

    setLoading(true);
    setNewlySaved([]);
    setSummary(null);
    setProgress({ total: 0, current: 0 });
    setStatusText('Searching DuckDuckGo...');

    try {
      const searchRes = await fetch(`/api/discovery/search?niche=${encodeURIComponent(finalNiche)}`);
      if (!searchRes.ok) throw new Error(`Search API failed with status ${searchRes.status}`);

      const searchData = await searchRes.json();
      if (searchData.error) throw new Error(searchData.error);

      const urls = searchData.urls || [];
      setStatusText(`Found ${urls.length} profiles across Qoruz, StarNgage, and Collabstr`);

      if (urls.length === 0) {
        setSummary({ saved: 0, skipped: 0, errors: 0 });
        setLoading(false);
        return;
      }

      const batchSize = 5;
      const totalUrls = urls.length;
      setProgress({ total: totalUrls, current: 0 });

      let totalSaved = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const savedHandles: string[] = [];

      for (let i = 0; i < totalUrls; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalUrls / batchSize);
        setStatusText(`Enriching batch ${batchNum} of ${totalBatches}...`);

        const enrichRes = await fetch('/api/discovery/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch, niche: finalNiche }),
        });

        if (!enrichRes.ok) {
          totalErrors += batch.length;
          setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
          continue;
        }

        const enrichData = await enrichRes.json();
        totalSaved += enrichData.saved || 0;
        totalSkipped += enrichData.skipped || 0;
        totalErrors += enrichData.errors || 0;

        if (enrichData.details) {
          enrichData.details.forEach((det: any) => {
            if (det.status === 'saved' && det.handle) {
              savedHandles.push(`@${det.handle}`);
            }
          });
          setNewlySaved([...savedHandles]);
        }

        setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
      }

      setSummary({ saved: totalSaved, skipped: totalSkipped, errors: totalErrors });
      onDiscoveryComplete();
    } catch (err: any) {
      setStatusText(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>

      {loading && (
        <div style={{ position: 'absolute', top: '-50%', left: '-50%', right: '-50%', bottom: '-50%', background: 'radial-gradient(circle, rgba(0, 149, 246, 0.03) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
      )}

      <style>{`
        @keyframes radar-pulse {
          0% { transform: scale(0.2); opacity: 0.8; }
          50% { opacity: 0.35; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .disc-radar-ring {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          border: 1px solid rgba(0, 149, 246, 0.22);
          border-radius: 50%;
          animation: radar-pulse 3s infinite linear;
        }
        .disc-radar-ring-2 { animation-delay: 1s; }
        .disc-radar-ring-3 { animation-delay: 2s; }
        .disc-radar-sweep {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: conic-gradient(from 0deg at 50% 50%, rgba(0, 149, 246, 0.1) 0deg, rgba(0, 149, 246, 0) 90deg);
          border-radius: 50%;
          animation: radar-sweep 2s infinite linear;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Influencer Discovery Engine</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Source and enrich public creator profiles across Qoruz, StarNgage, and Collabstr.
          </p>
        </div>
      </div>

      {/* Idle: show search form */}
      {!loading && !summary && (
        <form onSubmit={handleDiscover} style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1, width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="input-field"
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
              required
            >
              {VALID_NICHES.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="Other">Other / Custom</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', fontWeight: '500', flexShrink: 0 }}>
              Scrape
            </button>
          </div>
          {selectedOption === 'Other' && (
            <input
              type="text"
              value={customNiche}
              onChange={(e) => setCustomNiche(e.target.value)}
              placeholder="Enter custom niche (e.g. Pets, Lifestyle, DIY)"
              className="input-field"
              style={{ width: '100%' }}
              required
            />
          )}
        </form>
      )}

      {/* Loading: radar animation */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 10px', gap: '20px', zIndex: 1 }}>
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
            <div className="disc-radar-ring"></div>
            <div className="disc-radar-ring disc-radar-ring-2"></div>
            <div className="disc-radar-ring disc-radar-ring-3"></div>
            <div className="disc-radar-sweep"></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', backgroundColor: 'var(--color-accent-primary)', borderRadius: '50%', boxShadow: '0 0 12px var(--color-accent-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', animation: 'status-pulse 1.5s infinite ease-in-out' }}>
              {statusText}
            </div>
            {progress.total > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Processing {progress.current} of {progress.total} profiles ({Math.round((progress.current / progress.total) * 100)}%)
              </span>
            )}
          </div>
          {progress.total > 0 && (
            <div style={{ width: '100%', maxWidth: '300px', height: '4px', background: '#1c1c1e', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'var(--primary-gradient)', transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.25, 1)', boxShadow: '0 0 8px rgba(0, 149, 246, 0.5)' }} />
            </div>
          )}
        </div>
      )}

      {/* Complete: summary card */}
      {!loading && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '20px', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(18, 183, 106, 0.1)', color: 'var(--color-status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckIcon />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Discovery Complete</span>
            </div>
            <button onClick={() => setSummary(null)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '11px' }}>
              Discover More
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(18, 183, 106, 0.05)', border: '1px solid rgba(18, 183, 106, 0.15)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-status-success)' }}>Saved</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: 'var(--color-status-success)' }}>{summary.saved}</div>
            </div>
            <div style={{ background: 'rgba(115, 115, 115, 0.05)', border: '1px solid rgba(115, 115, 115, 0.15)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Skipped</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>{summary.skipped}</div>
            </div>
            <div style={{ background: 'rgba(240, 68, 56, 0.05)', border: '1px solid rgba(240, 68, 56, 0.15)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-status-error)' }}>Errors</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: summary.errors > 0 ? 'var(--color-status-error)' : 'var(--text-primary)' }}>{summary.errors}</div>
            </div>
          </div>

          {newlySaved.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Imported Creators:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '2px' }}>
                {newlySaved.map((handle, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--color-status-success)', display: 'flex' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor" /></svg>
                    </span>
                    {handle}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
