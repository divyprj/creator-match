'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DiscoveryPanel from './components/DiscoveryPanel';
import CreatorDrawer from './components/CreatorDrawer';
import OutreachModal from './components/OutreachModal';

import { Creator, AppSettings } from '@/types';

interface Stats {
  total: number;
  emailed: number;
  pending: number;
  avgEngagement: number;
}

const formatFollowers = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  return Math.round(num / 1000) + 'k';
};

export default function Dashboard() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, emailed: 0, pending: 0, avgEngagement: 0 });
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filter States
  const [selectedNiche, setSelectedNiche] = useState('All');
  const [minFollowers, setMinFollowers] = useState(5000);
  const [maxFollowers, setMaxFollowers] = useState(10000000);
  const [locationSearch, setLocationSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSegment, setShowSegment] = useState(false); // Indian Fashion & Beauty segment

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal / Drawer States
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [activeOutreachCreator, setActiveOutreachCreator] = useState<Creator | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    gemini_api_key: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    loadSettings();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchCreatorsList();
  }, [selectedNiche, minFollowers, maxFollowers, locationSearch, statusFilter, searchQuery, showSegment]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCreatorsList(), fetchStats()]);
    setLoading(false);
  };
  const loadSettings = async () => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('creator_match_settings');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setSettings(parsed);
        } catch (e) {
          console.warn('Failed to parse localStorage settings', e);
        }
      }
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      // Save to local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('creator_match_settings', JSON.stringify(settings));
      }
      alert('Settings saved successfully in your browser! (Fallbacks to server-side env vars if any field is left empty)');
      setShowSettings(false);
    } catch (err: any) {
      alert(`Error saving settings locally: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportCSV = () => {
    if (creators.length === 0) return;

    // Define CSV Headers
    const headers = [
      'Name',
      'Handle',
      'Niche',
      'Followers',
      'Engagement Rate',
      'Location',
      'Email',
      'Status'
    ];

    // Map creator data to rows, escaping values
    const rows = creators.map((c) => {
      const escapedName = `"${(c.name || '').replace(/"/g, '""')}"`;
      const escapedHandle = `"${(c.handle || '').replace(/"/g, '""')}"`;
      const escapedNiche = `"${(c.niche || '').replace(/"/g, '""')}"`;
      const followers = c.followers_count;
      const engRate = `"${(c.engagement_rate_str || (c.engagement_rate ? `${c.engagement_rate}%` : 'N/A')).replace(/"/g, '""')}"`;
      const escapedLocation = `"${(c.location || 'N/A').replace(/"/g, '""')}"`;
      const escapedEmail = `"${(c.email || 'N/A').replace(/"/g, '""')}"`;
      const escapedStatus = `"${(c.outreach_status || 'uncontacted').replace(/"/g, '""')}"`;

      return [
        escapedName,
        escapedHandle,
        escapedNiche,
        followers,
        engRate,
        escapedLocation,
        escapedEmail,
        escapedStatus
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `creator_outreach_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchCreatorsList = async () => {
    try {
      setCurrentPage(1);
      let query = supabase.from('influencers').select('*');

      // 1. Segment Tab Filter: Indian Fashion & Beauty
      if (showSegment) {
        query = query
          .in('niche', ['Fashion', 'Beauty', 'fashion', 'beauty'])
          .gte('engagement_rate', 3.0); // Filter for high engagement
      } else {
        // Niche Filter
        if (selectedNiche !== 'All') {
          query = query.ilike('niche', selectedNiche);
        }
      }

      // Follower count range filter
      query = query.gte('followers_count', minFollowers).lte('followers_count', maxFollowers);

      // Location search
      if (locationSearch.trim()) {
        query = query.ilike('location', `%${locationSearch}%`);
      }

      // Status Filter
      if (statusFilter !== 'All') {
        query = query.eq('outreach_status', statusFilter);
      }

      // Text search query (Name or Handle)
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%`);
      }

      // Sort by followers desc
      query = query.order('followers_count', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setCreators(data || []);
      setDbError(null);
    } catch (e: any) {
      console.warn('Error fetching creators:', e.message || e);
      setDbError('Failed to connect to Supabase database. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your .env.local file.');
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allData, error } = await supabase.from('influencers').select('outreach_status, engagement_rate');
      if (error) throw error;

      const total = allData.length;
      const emailed = allData.filter((c) => c.outreach_status === 'emailed').length;
      const pending = allData.filter((c) => c.outreach_status !== 'emailed').length;
      
      const rates = allData.map((c) => c.engagement_rate || 0).filter((r) => r > 0);
      const avgEngagement = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

      setStats({
        total,
        emailed,
        pending,
        avgEngagement,
      });
      setDbError(null);
    } catch (e: any) {
      console.warn('Error fetching statistics:', e.message || e);
      setDbError('Failed to connect to Supabase database. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your .env.local file.');
    }
  };

  const handleDiscoveryComplete = () => {
    fetchData();
  };

  const handleStatusUpdate = () => {
    fetchCreatorsList();
    fetchStats();
    // Refresh selected creator inside drawer
    if (selectedCreator) {
      const updated = creators.find((c) => c.id === selectedCreator.id);
      if (updated) {
        setSelectedCreator(updated);
      } else {
        // If not found in loaded list, fetch single
        supabase.from('influencers').select('*').eq('id', selectedCreator.id).single()
          .then(({ data }) => data && setSelectedCreator(data));
      }
    }
  };

  const handleSelectSegment = (enable: boolean) => {
    setShowSegment(enable);
    setSelectedNiche('All'); // Clear explicit niche dropdown when segment is active
  };

  const totalPages = Math.ceil(creators.length / itemsPerPage);
  const paginatedCreators = creators.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="dashboard-grid">
      {/* Sidebar / Filters */}      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon.svg" alt="Creator Match Logo" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.02em', color: 'var(--color-text-primary)' }}>
            CREATOR MATCH
          </h1>
        </div>

        {/* Niche Filter */}
        <div className="input-group">
          <label htmlFor="niche-select" className="input-label">Niche</label>
          <select
            id="niche-select"
            value={selectedNiche}
            onChange={(e) => {
              setSelectedNiche(e.target.value);
              setShowSegment(false);
            }}
            className="input-field"
            style={{ background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
          >
            <option value="All">All Niches</option>
            <option value="Fashion">Fashion</option>
            <option value="Beauty">Beauty</option>
            <option value="Fitness">Fitness</option>
            <option value="Food">Food</option>
            <option value="Tech">Tech</option>
            <option value="Gaming">Gaming</option>
            <option value="Finance">Finance</option>
            <option value="Education">Education</option>
            <option value="Travel">Travel</option>
            <option value="Parenting">Parenting</option>
          </select>
        </div>

        {/* Follower Range Filter */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="input-label" id="followers-range-label">Followers Range</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)' }}>{formatFollowers(minFollowers)} - {formatFollowers(maxFollowers)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <input
              type="range"
              aria-labelledby="followers-range-label"
              aria-valuemin={5000}
              aria-valuemax={10000000}
              aria-valuenow={minFollowers}
              min="5000"
              max="10000000"
              step="5000"
              value={minFollowers}
              onChange={(e) => setMinFollowers(parseInt(e.target.value))}
              className="range-slider"
            />
            <input
              type="range"
              aria-labelledby="followers-range-label"
              aria-valuemin={5000}
              aria-valuemax={10000000}
              aria-valuenow={maxFollowers}
              min="5000"
              max="10000000"
              step="5000"
              value={maxFollowers}
              onChange={(e) => setMaxFollowers(parseInt(e.target.value))}
              className="range-slider"
            />
          </div>
        </div>

        {/* Location Search */}
        <div className="input-group">
          <label htmlFor="location-search" className="input-label">Location (City/State)</label>
          <input
            id="location-search"
            type="text"
            placeholder="e.g. Mumbai, Lucknow"
            className="input-field"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </div>

        {/* Segment Filter Tab */}
        <div className="input-group" style={{ marginTop: '10px' }}>
          <label className="input-label">Segments</label>
          <button
            onClick={() => handleSelectSegment(!showSegment)}
            className="btn"
            style={{
              background: showSegment ? 'var(--color-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: showSegment ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              justifyContent: 'center',
              fontSize: '12px',
              padding: '8px 12px',
              marginTop: '4px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }} aria-hidden="true">
              <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>
            </svg>
            Fashion & Beauty (&gt;3% ER)
          </button>
        </div>

        {/* Settings button */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setShowSettings(true)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Credentials & SMTP
          </button>
        </div>
      </aside>


      {/* Main Dashboard Panel */}
      <main className="main-content">
        {/* Header section */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>Dashboard</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Manage your influencer outreach list and campaigns.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowDiscovery(!showDiscovery)} className="btn btn-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }} aria-hidden="true">
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>
              </svg>
              Discover Influencers
            </button>
          </div>
        </header>

        {dbError && (
          <div className="glass" style={{ padding: '16px', background: 'var(--color-status-error-bg)', borderColor: 'var(--color-status-error)', color: '#fca5a5', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h4 style={{ fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }} aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Database Connection Alert
            </h4>
            <p style={{ fontSize: '13px', color: '#cbd5e1' }}>{dbError}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Creators</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px' }}>{stats.total}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Emailed</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-status-success)' }}>{stats.emailed}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Outreach</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-status-warning)' }}>{stats.pending}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Engagement Rate</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-accent-primary)' }}>{stats.avgEngagement.toFixed(2)}%</div>
          </div>
        </div>

        {/* Discovery Panel Expansion */}
        {showDiscovery && (
          <DiscoveryPanel onDiscoveryComplete={handleDiscoveryComplete} />
        )}

        {/* Creators Table Container */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Table Header Filter bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--card-border)', gap: '15px', alignItems: 'center' }}>
            {/* Search Input */}
            <input
              type="text"
              aria-label="Search by name or handle"
              placeholder="Search by name or handle..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '300px' }}
            />

            {/* Right actions: Status Filters + Export CSV */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                {['All', 'uncontacted', 'draft_created', 'emailed', 'dm_copied'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      background: statusFilter === filter ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none',
                      color: statusFilter === filter ? 'white' : 'var(--color-text-secondary)',
                    }}
                  >
                    {filter.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
                disabled={creators.length === 0}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-scroll-container">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
              </div>
            ) : creators.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', color: 'var(--color-text-secondary)', gap: '12px', textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h4 style={{ fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>No creators found</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, maxWidth: '280px' }}>Click "Discover Influencers" above to build your database!</p>
              </div>
            ) : (

              <table className="creator-table">
                <thead>
                  <tr>
                    <th>Influencer</th>
                    <th>Niche</th>
                    <th>Followers</th>
                    <th>Engagement</th>
                    <th>Location</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCreators.map((c) => (
                    <tr key={c.id} onClick={() => setSelectedCreator(c)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {c.profile_image ? (
                            <img src={c.profile_image} alt={c.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{c.name[0]}</div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '500' }}>{c.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>@{c.handle}</span>
                          </div>
                        </div>
                      </td>
                      <td>{c.niche}</td>
                      <td>{c.followers_count.toLocaleString()}</td>
                      <td>{c.engagement_rate_str || (c.engagement_rate ? `${c.engagement_rate}%` : 'N/A')}</td>
                      <td>{c.location || 'N/A'}</td>
                      <td style={{ color: c.email ? '#10b981' : 'var(--text-muted)' }}>{c.email || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${c.outreach_status}`}>
                          {c.outreach_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveOutreachCreator(c)}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Outreach
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && creators.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--card-border)', gap: '15px', background: 'rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, creators.length)} of {creators.length} creators
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Creator Profile Drawer */}
      {selectedCreator && (
        <CreatorDrawer
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onOpenOutreach={(c) => {
            setSelectedCreator(null);
            setActiveOutreachCreator(c);
          }}
        />
      )}

      {/* Outreach Copy / Sending Modal */}
      {activeOutreachCreator && (
        <OutreachModal
          creator={activeOutreachCreator}
          onClose={() => setActiveOutreachCreator(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <form onSubmit={saveSettings} className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>App Credentials & SMTP Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Gemini Key */}
              <div className="input-group">
                <label htmlFor="settings-gemini-key" className="input-label">Gemini API Key</label>
                <input
                  id="settings-gemini-key"
                  type="password"
                  value={settings.gemini_api_key}
                  onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                  placeholder="Enter your Gemini API key"
                  className="input-field"
                  required
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Required for generating personalized emails/DMs using creator content.</span>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--card-border)' }} />

              {/* SMTP credentials */}
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-accent-primary)' }}>Gmail SMTP Configurations</h4>
              <div className="input-group">
                <label htmlFor="settings-smtp-host" className="input-label">SMTP Host</label>
                <input
                  id="settings-smtp-host"
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  placeholder="e.g. smtp.gmail.com"
                  className="input-field"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="settings-smtp-port" className="input-label">SMTP Port</label>
                <input
                  id="settings-smtp-port"
                  type="number"
                  value={settings.smtp_port}
                  onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 465 })}
                  className="input-field"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="settings-smtp-user" className="input-label">SMTP Username (Email)</label>
                <input
                  id="settings-smtp-user"
                  type="email"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  placeholder="e.g. user@gmail.com"
                  className="input-field"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="settings-smtp-pass" className="input-label">SMTP Password / App Password</label>
                <input
                  id="settings-smtp-pass"
                  type="password"
                  value={settings.smtp_pass}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  placeholder="Gmail App Password"
                  className="input-field"
                  required
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Tip: For Gmail, navigate to your Google Account Settings &gt; Security &gt; 2-Step Verification &gt; App Passwords. Generate a password for "Mail".
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
              {savingSettings ? 'Saving...' : 'Save Configurations'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
