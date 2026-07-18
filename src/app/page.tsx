'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DiscoveryPanel from './components/DiscoveryPanel';
import CreatorDrawer from './components/CreatorDrawer';
import OutreachModal from './components/OutreachModal';

import { Creator } from '@/types';

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
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [guestCreators, setGuestCreators] = useState<Creator[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, emailed: 0, pending: 0, avgEngagement: 0 });
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filter States (display values — updated instantly for responsive UI)
  const [selectedNiche, setSelectedNiche] = useState('All');
  const [minFollowers, setMinFollowers] = useState(5000);
  const [maxFollowers, setMaxFollowers] = useState(10000000);
  const [locationSearch, setLocationSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSegment, setShowSegment] = useState(false); // High Engagement segment (≥3% ER)

  // Debounced filter values — used for actual data fetching (300ms delay)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [debouncedNiche, setDebouncedNiche] = useState('All');
  const [debouncedMinFollowers, setDebouncedMinFollowers] = useState(5000);
  const [debouncedMaxFollowers, setDebouncedMaxFollowers] = useState(10000000);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce effect: updates debounced values 300ms after the user stops typing/sliding
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDebouncedLocation(locationSearch);
      setDebouncedNiche(selectedNiche);
      setDebouncedMinFollowers(minFollowers);
      setDebouncedMaxFollowers(maxFollowers);
    }, 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchQuery, locationSearch, selectedNiche, minFollowers, maxFollowers]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal / Drawer States
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [activeOutreachCreator, setActiveOutreachCreator] = useState<Creator | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sort States
  const [sortField, setSortField] = useState<string>('followers_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Toast Notifications
  const [toasts, setToasts] = useState<Array<{id: number; message: string; type: 'success' | 'error' | 'info'}>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Credential Status State
  const [credentialStatus, setCredentialStatus] = useState<{ gemini: boolean; smtp: boolean; smtp_user_display: string | null }>({ gemini: false, smtp: false, smtp_user_display: null });

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsAuthenticated(loggedIn);
      setUserEmail(session?.user?.email || null);
      if (loggedIn) {
        // User just logged in — fetch from DB
        fetchData();
      } else {
        // Guest — show guest creators from memory
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated === null) return; // waiting for auth check
    if (isAuthenticated) {
      fetchData();
      fetchCredentialStatus();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Refetch when filters change (uses debounced values for text/slider inputs)
  useEffect(() => {
    fetchCreatorsList();
    fetchStats();
  }, [debouncedNiche, debouncedMinFollowers, debouncedMaxFollowers, debouncedLocation, statusFilter, debouncedSearch, showSegment, guestCreators]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCreatorsList(), fetchStats()]);
    setLoading(false);
  };
  const fetchCredentialStatus = async () => {
    try {
      const res = await fetch('/api/settings/status');
      if (res.ok) {
        const data = await res.json();
        setCredentialStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch credential status');
    }
  };

  const handleOpenOutreach = (creator: Creator) => {
    if (!isAuthenticated) {
      showToast('Please sign in or sign up to personalize and send outreach!', 'info');
      router.push('/login');
      return;
    }
    setActiveOutreachCreator(creator);
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
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
  };

  const fetchCreatorsList = async () => {
    if (!isAuthenticated) {
      // Guest mode: apply filters to in-memory guestCreators
      let filtered = [...guestCreators];
      if (showSegment) {
        filtered = filtered.filter(c => (c.engagement_rate || 0) >= 3.0);
      } else if (debouncedNiche !== 'All' && debouncedNiche.trim()) {
        filtered = filtered.filter(c => c.niche?.toLowerCase().includes(debouncedNiche.toLowerCase()));
      }
      filtered = filtered.filter(c => (c.followers_count || 0) >= debouncedMinFollowers);
      if (debouncedMaxFollowers < 10000000) {
        filtered = filtered.filter(c => (c.followers_count || 0) <= debouncedMaxFollowers);
      }
      if (debouncedLocation.trim()) {
        filtered = filtered.filter(c => c.location?.toLowerCase().includes(debouncedLocation.toLowerCase()));
      }
      if (statusFilter !== 'All') {
        filtered = filtered.filter(c => c.outreach_status === statusFilter);
      }
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(c => c.name?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q));
      }
      filtered.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
      setCreators(filtered);
      setCurrentPage(1);
      return;
    }
    try {
      setCurrentPage(1);
      let query = supabase.from('influencers').select('*');

      // 1. Segment Tab Filter: High Engagement creators (≥3% ER)
      if (showSegment) {
        query = query
          .gte('engagement_rate', 3.0);
      } else {
        // Niche Filter (uses debounced value, supports partial matching)
        if (debouncedNiche !== 'All' && debouncedNiche.trim()) {
          query = query.ilike('niche', `%${debouncedNiche}%`);
        }
      }

      // Follower count range filter (uses debounced values)
      query = query.gte('followers_count', debouncedMinFollowers);
      if (debouncedMaxFollowers < 10000000) {
        query = query.lte('followers_count', debouncedMaxFollowers);
      }

      // Location search (uses debounced value)
      if (debouncedLocation.trim()) {
        query = query.ilike('location', `%${debouncedLocation}%`);
      }

      // Status Filter
      if (statusFilter !== 'All') {
        query = query.eq('outreach_status', statusFilter);
      }

      // Text search query — Name or Handle (uses debounced value)
      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch}%,handle.ilike.%${debouncedSearch}%`);
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
    if (!isAuthenticated) {
      // Guest mode: compute stats from guestCreators
      const total = guestCreators.length;
      const emailed = guestCreators.filter(c => c.outreach_status === 'emailed').length;
      const pending = total - emailed;
      const rates = guestCreators.map(c => c.engagement_rate || 0).filter(r => r > 0);
      const avgEngagement = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      setStats({ total, emailed, pending, avgEngagement });
      return;
    }
    try {
      const [totalRes, emailedRes, engRes] = await Promise.all([
        supabase.from('influencers').select('*', { count: 'exact', head: true }),
        supabase.from('influencers').select('*', { count: 'exact', head: true }).eq('outreach_status', 'emailed'),
        supabase.from('influencers').select('engagement_rate').gt('engagement_rate', 0),
      ]);

      if (totalRes.error) throw totalRes.error;

      const total = totalRes.count || 0;
      const emailed = emailedRes.count || 0;
      const pending = total - emailed;

      const rates = (engRes.data || []).map((c) => c.engagement_rate || 0);
      const avgEngagement = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

      setStats({ total, emailed, pending, avgEngagement });
      setDbError(null);
    } catch (e: any) {
      console.warn('Error fetching statistics:', e.message || e);
      setDbError('Failed to connect to Supabase database. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your .env.local file.');
    }
  };

  const handleDiscoveryComplete = (enrichResult?: any) => {
    if (isAuthenticated) {
      // Authenticated: data was saved to DB, just refetch
      fetchData();
    } else if (enrichResult?.details) {
      // Guest: add enriched profiles to in-memory state
      const newCreators: Creator[] = enrichResult.details
        .filter((d: any) => d.status === 'saved')
        .map((d: any, idx: number) => ({
          id: Date.now() + idx, // temp ID for guest
          handle: d.handle,
          name: d.name,
          email: d.email,
          followers_count: d.followers,
          engagement_rate: typeof d.engagement_rate === 'string'
            ? parseFloat(d.engagement_rate) || null
            : d.engagement_rate,
          engagement_rate_str: typeof d.engagement_rate === 'string' ? d.engagement_rate : null,
          niche: d.niche,
          location: d.location,
          bio: d.bio,
          profile_image: d.profile_image,
          recent_posts: d.recent_posts,
          outreach_status: 'uncontacted',
        }));
      setGuestCreators(prev => {
        const existing = new Set(prev.map(c => c.handle));
        const unique = newCreators.filter(c => !existing.has(c.handle));
        return [...prev, ...unique];
      });
    }
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

  // Sort creators client-side
  const sortedCreators = [...creators].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case 'name': aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; break;
      case 'niche': aVal = a.niche?.toLowerCase() || ''; bVal = b.niche?.toLowerCase() || ''; break;
      case 'followers_count': aVal = a.followers_count || 0; bVal = b.followers_count || 0; break;
      case 'engagement_rate': aVal = a.engagement_rate || 0; bVal = b.engagement_rate || 0; break;
      case 'location': aVal = a.location?.toLowerCase() || ''; bVal = b.location?.toLowerCase() || ''; break;
      default: aVal = a.followers_count || 0; bVal = b.followers_count || 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCreators.length / itemsPerPage);
  const paginatedCreators = sortedCreators.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Niche distribution for analytics
  const nicheStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    creators.forEach(c => {
      const niche = c.niche || 'Other';
      counts[niche] = (counts[niche] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 1;
    return { entries, max };
  }, [creators]);

  return (
    <div className="dashboard-grid">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-sidebar-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Filters */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/icon.svg" alt="Creator Match Logo" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.02em', color: 'var(--color-text-primary)' }}>
              Creator Match
            </h1>
          </div>
          {/* Close button for mobile drawer */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-menu-toggle"
            aria-label="Close menu"
            style={{ display: mobileMenuOpen ? 'flex' : 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Auth Banner */}
        {isAuthenticated === false && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(29, 143, 255, 0.05)',
            border: '1px solid rgba(29, 143, 255, 0.12)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Guest Session</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Your work won't be saved after you leave.</p>
            <button
              onClick={() => router.push('/login')}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--color-accent-primary)',
                background: 'rgba(29, 143, 255, 0.1)',
                border: '1px solid rgba(29, 143, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'center',
                marginTop: '4px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(29, 143, 255, 0.15)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(29, 143, 255, 0.1)')}
            >
              Save Workspace
            </button>
          </div>
        )}
        {isAuthenticated && userEmail && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(18, 183, 106, 0.06)',
            border: '1px solid rgba(18, 183, 106, 0.12)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</span>
          </div>
        )}

        {/* Niche Filter */}
        <div className="input-group">
          <label htmlFor="niche-search" className="input-label">Industry</label>
          <input
            id="niche-search"
            type="text"
            placeholder="Fashion, Beauty, Gaming, Fitness..."
            className="input-field"
            value={selectedNiche === 'All' ? '' : selectedNiche}
            onChange={(e) => {
              setSelectedNiche(e.target.value || 'All');
              setShowSegment(false);
            }}
          />
        </div>

        {/* Follower Range Filter */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="input-label" id="followers-range-label">Audience Size</span>
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
          <label htmlFor="location-search" className="input-label">Location</label>
          <input
            id="location-search"
            type="text"
            placeholder="City or State"
            className="input-field"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </div>

        {/* Segment Filter Tab */}
        <div className="input-group" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="input-label">Creator Segments</label>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            High Engagement
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '4px', marginTop: '2px' }}>
            Engagement Rate &gt; 3%
          </span>
        </div>

        {/* Settings button */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setShowSettings(true)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Email Settings
          </button>
          {isAuthenticated ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setGuestCreators([]);
                setCreators([]);
                router.push('/login');
                router.refresh();
              }}
              className="btn"
              style={{ width: '100%', justifyContent: 'center', background: 'rgba(240, 68, 56, 0.08)', borderColor: 'rgba(240, 68, 56, 0.2)', color: '#F04438', fontSize: '12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="btn"
              style={{ width: '100%', justifyContent: 'center', background: 'rgba(29, 143, 255, 0.08)', borderColor: 'rgba(29, 143, 255, 0.2)', color: 'var(--color-accent-primary)', fontSize: '12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <div className={mobileMenuOpen ? 'main-content-blur' : ''} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Mobile Header Bar */}
        <div className="mobile-header">
          <button onClick={() => setMobileMenuOpen(true)} className="mobile-menu-toggle" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icon.svg" alt="Logo" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
            <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>Creator Match</span>
          </div>
        </div>

        <main className="main-content">
        {/* Header section */}
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold' }}>Dashboard</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Build creator lists, personalize outreach, and track campaign progress.</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowDiscovery(!showDiscovery)} className="btn btn-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Discover Creators
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
        <div className="stats-grid">
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Creators</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '6px' }}>{stats.total}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Emails Sent</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-status-success)' }}>{stats.emailed}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pending Outreach</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-status-warning)' }}>{stats.pending}</div>
          </div>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Average Engagement</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '6px', color: 'var(--color-accent-primary)' }}>{stats.avgEngagement.toFixed(2)}%</div>
          </div>
        </div>

        {/* Niche Distribution Chart */}
        {!loading && creators.length > 0 && (
          <div className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>Industry Distribution</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nicheStats.entries.slice(0, 6).map(([niche, count]) => (
                <div key={niche} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', width: '70px', flexShrink: 0, textAlign: 'right' }}>{niche}</span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div className="niche-bar" style={{ width: `${(count / nicheStats.max) * 100}%`, height: '100%', borderRadius: '3px', background: 'var(--primary-gradient)' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-primary)', width: '24px', flexShrink: 0 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovery Panel Expansion */}
        {showDiscovery && (
          <DiscoveryPanel onDiscoveryComplete={handleDiscoveryComplete} />
        )}

        {/* Creators Table Container */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Table Header Filter bar */}
          <div className="table-filter-bar">
            {/* Search Input */}
            <input
              type="text"
              aria-label="Search creators"
              placeholder="Search creators..."
              className="input-field search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Right actions: Status Filters + Export */}
            <div className="table-filter-actions">
              {/* Status Filters */}
              <div className="status-filter-tabs">
                {['All', 'uncontacted', 'draft_created', 'emailed', 'dm_copied'].map((filter) => {
                  const labelMap: Record<string, string> = {
                    All: 'All',
                    uncontacted: 'Not Contacted',
                    draft_created: 'Draft Ready',
                    emailed: 'Email Sent',
                    dm_copied: 'Message Copied'
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => {
                        setStatusFilter(filter);
                        setMobileMenuOpen(false);
                      }}
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
                      {labelMap[filter] || filter}
                    </button>
                  );
                })}
              </div>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary export-btn"
                disabled={creators.length === 0}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
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
                <h4 style={{ fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>No creators yet</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0', maxWidth: '280px' }}>Discover creators to begin building your outreach list.</p>
                <button onClick={() => setShowDiscovery(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Discover Creators
                </button>
              </div>
            ) : (
              <>
              <table className="creator-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable-th" aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      Creator {sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('niche')} className="sortable-th" aria-sort={sortField === 'niche' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      Niche {sortField === 'niche' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('followers_count')} className="sortable-th" aria-sort={sortField === 'followers_count' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      Followers {sortField === 'followers_count' ? (sortDirection === 'asc' ? '↑' : '↓') : '↓'}
                    </th>
                    <th onClick={() => handleSort('engagement_rate')} className="sortable-th" aria-sort={sortField === 'engagement_rate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      Engagement {sortField === 'engagement_rate' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('location')} className="sortable-th" aria-sort={sortField === 'location' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      Location {sortField === 'location' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
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
                            <img 
                              src={c.profile_image} 
                              alt={c.name} 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                              onError={(e) => {
                                e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" fill="%23262626" /><circle cx="16" cy="11" r="5" fill="%23737373" /><path d="M6 26c0-4.4 3.6-8 8-8h4c4.4 0 8 3.6 8 8z" fill="%23737373" /></svg>`;
                              }}
                            />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{(c.name || '?')[0]}</div>
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
                            onClick={() => handleOpenOutreach(c)}
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

              {/* Mobile Card Layout */}
              <div className="mobile-creator-cards">
                {paginatedCreators.map((c) => (
                  <div key={c.id} className="mobile-creator-card" onClick={() => setSelectedCreator(c)}>
                    {c.profile_image ? (
                      <img
                        src={c.profile_image}
                        alt={c.name}
                        className="mobile-creator-avatar"
                        onError={(e) => {
                          e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44"><rect width="44" height="44" fill="%23262626" rx="22" /><circle cx="22" cy="15" r="7" fill="%23737373" /><path d="M8 36c0-6.1 5-11 11-11h6c6.1 0 11 5 11 11z" fill="%23737373" /></svg>`;
                        }}
                      />
                    ) : (
                      <div className="mobile-creator-avatar-placeholder">{(c.name || '?')[0]}</div>
                    )}
                    <div className="mobile-creator-info">
                      <div className="mobile-creator-name">{c.name}</div>
                      <div className="mobile-creator-handle">@{c.handle}</div>
                      <div className="mobile-creator-meta">
                        <span className="mobile-creator-meta-item">
                          {c.engagement_rate_str || (c.engagement_rate ? `${c.engagement_rate}%` : 'N/A')} eng.
                        </span>
                        {c.location && (
                          <>
                            <span className="mobile-creator-meta-dot" />
                            <span className="mobile-creator-meta-item">{c.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mobile-creator-right">
                      <div className="mobile-creator-followers">{formatFollowers(c.followers_count)}</div>
                      <div className="mobile-creator-niche">{c.niche}</div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && creators.length > 0 && (
            <div className="pagination-bar">
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedCreators.length)} of {sortedCreators.length} creators
              </span>
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {currentPage} / {totalPages || 1}
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
      </div>

      {/* Creator Profile Drawer */}
      {selectedCreator && (
        <CreatorDrawer
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onOpenOutreach={(c) => {
            setSelectedCreator(null);
            handleOpenOutreach(c);
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Email & API Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Gemini Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '8px', background: credentialStatus.gemini ? 'rgba(18, 183, 106, 0.08)' : 'rgba(240, 68, 56, 0.08)', border: `1px solid ${credentialStatus.gemini ? 'rgba(18, 183, 106, 0.2)' : 'rgba(240, 68, 56, 0.2)'}` }}>
                <span style={{ fontSize: '18px' }}>{credentialStatus.gemini ? '✓' : '✕'}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Gemini API Key</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {credentialStatus.gemini ? 'Configured via environment variable' : 'Not configured — set GEMINI_API_KEY in .env.local'}
                  </div>
                </div>
              </div>

              {/* SMTP Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '8px', background: credentialStatus.smtp ? 'rgba(18, 183, 106, 0.08)' : 'rgba(240, 68, 56, 0.08)', border: `1px solid ${credentialStatus.smtp ? 'rgba(18, 183, 106, 0.2)' : 'rgba(240, 68, 56, 0.2)'}` }}>
                <span style={{ fontSize: '18px' }}>{credentialStatus.smtp ? '✓' : '✕'}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Email Provider</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {credentialStatus.smtp
                      ? `Configured${credentialStatus.smtp_user_display ? ` (${credentialStatus.smtp_user_display})` : ''}`
                      : 'Not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS variables in .env.local'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                <strong>How to configure:</strong> Add your credentials to the <code>.env.local</code> file in the project root. For Vercel deployments, set them as Environment Variables in the Vercel dashboard.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            {toast.message}
          </div>
        ))}
      </div>

    </div>
  );
}
