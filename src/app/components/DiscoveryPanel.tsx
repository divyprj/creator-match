'use client';

import React, { useState } from 'react';

interface DiscoveryPanelProps {
  onDiscoveryComplete: () => void;
}

export default function DiscoveryPanel({ onDiscoveryComplete }: DiscoveryPanelProps) {
  const [niche, setNiche] = useState('Fashion');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ total: 0, current: 0 });

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim()) return;

    setLoading(true);
    setLogs([]);
    setProgress({ total: 0, current: 0 });

    try {
      addLog(`Initiating discovery search for niche: "${niche}"...`);
      
      const searchRes = await fetch(`/api/discovery/search?niche=${encodeURIComponent(niche)}`);
      if (!searchRes.ok) {
        throw new Error(`Search API failed with status ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      if (searchData.error) {
        throw new Error(searchData.error);
      }

      const urls = searchData.urls || [];
      addLog(`Found ${urls.length} potential creator profiles on Qoruz.`);

      if (urls.length === 0) {
        addLog('No profiles found. Try a different niche or keyword.');
        setLoading(false);
        return;
      }

      // Batch profile enrichment to prevent server timeouts (e.g. 5 profiles per batch)
      const batchSize = 5;
      const totalUrls = urls.length;
      setProgress({ total: totalUrls, current: 0 });

      addLog(`Starting enrichment & database upsert in batches of ${batchSize}...`);

      let totalSaved = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (let i = 0; i < totalUrls; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        addLog(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} profiles)...`);

        const enrichRes = await fetch('/api/discovery/enrich', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: batch, niche }),
        });

        if (!enrichRes.ok) {
          addLog(`Batch ${Math.floor(i / batchSize) + 1} failed: HTTP ${enrichRes.status}`);
          totalErrors += batch.length;
          setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
          continue;
        }

        const enrichData = await enrichRes.json();
        totalSaved += enrichData.saved || 0;
        totalSkipped += enrichData.skipped || 0;
        totalErrors += enrichData.errors || 0;

        // Log detailed outcomes
        if (enrichData.details) {
          enrichData.details.forEach((det: any) => {
            if (det.status === 'saved') {
              addLog(`✔ Saved: @${det.handle} (${det.followers.toLocaleString()} followers, ER: ${det.engagement_rate})`);
            } else if (det.status === 'skipped') {
              addLog(`ℹ Skipped URL: ${det.reason}`);
            } else if (det.status === 'error') {
              addLog(`✘ Error URL: ${det.message}`);
            }
          });
        }

        setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
      }

      addLog(`\nDiscovery completed!`);
      addLog(`Summary: Saved ${totalSaved} new micro-influencers, Skipped ${totalSkipped}, Errors ${totalErrors}`);
      onDiscoveryComplete();

    } catch (err: any) {
      addLog(`CRITICAL ERROR: ${err.message}`);
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Influencer Discovery</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Automatically scrape public Qoruz profiles matching your niche from DuckDuckGo.
      </p>

      <form onSubmit={handleDiscover} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Niche (e.g. Fashion, Tech)"
          className="input-field"
          disabled={loading}
          style={{ flex: 1 }}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <div className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : 'Scrape'}
        </button>
      </form>

      {progress.total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Progress: {progress.current} / {progress.total} urls</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
                height: '100%',
                background: 'var(--primary-gradient)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#34d399',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
