'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Creator {
  id: string;
  handle: string;
  name: string;
  email: string | null;
  followers_count: number;
  engagement_rate: number | null;
  engagement_rate_str: string | null;
  location: string | null;
  niche: string;
  bio: string | null;
  profile_image: string | null;
  recent_posts: any[] | null;
  outreach_status: string;
}

interface OutreachLog {
  id: string;
  type: 'email' | 'dm';
  subject: string | null;
  content: string;
  status: 'draft' | 'sent';
  created_at: string;
}

interface CreatorDrawerProps {
  creator: Creator | null;
  onClose: () => void;
  onOpenOutreach: (creator: Creator) => void;
}

export default function CreatorDrawer({ creator, onClose, onOpenOutreach }: CreatorDrawerProps) {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (creator) {
      fetchOutreachLogs(creator.id);
    }
  }, [creator]);

  const fetchOutreachLogs = async (creatorId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('outreach_logs')
        .select('*')
        .eq('influencer_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (e: any) {
      console.warn('Error fetching outreach logs:', e.message || e);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!creator) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '15px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Creator Profile</h2>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Close
          </button>
        </div>

        {/* Profile Header Block */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {creator.profile_image ? (
            <img 
              src={creator.profile_image} 
              alt={creator.name} 
              style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
          ) : (
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
              {creator.name[0]}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{creator.name}</h3>
            <a 
              href={`https://instagram.com/${creator.handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
            >
              @{creator.handle}
            </a>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span className="badge badge-uncontacted">{creator.niche}</span>
              <span className={`badge badge-${creator.outreach_status}`}>
                {creator.outreach_status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="glass" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Followers</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: 'var(--secondary)' }}>
              {creator.followers_count.toLocaleString()}
            </div>
          </div>
          <div className="glass" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Engagement</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: 'var(--primary)' }}>
              {creator.engagement_rate_str || (creator.engagement_rate ? `${creator.engagement_rate}%` : 'N/A')}
            </div>
          </div>
        </div>

        {/* Outreach Action Button */}
        <button 
          onClick={() => onOpenOutreach(creator)}
          className="btn btn-primary" 
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        >
          Generate Personalized Outreach
        </button>

        {/* Info Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {creator.email && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Email</span>
              <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '500' }}>{creator.email}</span>
            </div>
          )}
          {creator.location && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Location</span>
              <span style={{ fontSize: '14px' }}>{creator.location}</span>
            </div>
          )}
          {creator.bio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Bio</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{creator.bio}</p>
            </div>
          )}
        </div>

        {/* Recent Posts Section */}
        {creator.recent_posts && creator.recent_posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--card-border)', paddingBottom: '6px' }}>Recent Content</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {creator.recent_posts.map((post: any, i: number) => (
                <div key={i} className="glass" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '500' }}>{post.type || 'Post'}</span>
                    <a 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary)', textDecoration: 'none' }}
                    >
                      View Post
                    </a>
                  </div>
                  {post.text && (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.3' }}>
                      "{post.text.substring(0, 120)}{post.text.length > 120 ? '...' : ''}"
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {post.likes && <span>❤ {post.likes}</span>}
                    {post.comments && <span>💬 {post.comments}</span>}
                    {post.views && <span>👁 {post.views}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outreach History Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--card-border)', paddingBottom: '6px' }}>Outreach History</h4>
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="loader" />
            </div>
          ) : logs.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No outreach attempts recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.map((log) => (
                <div key={log.id} className="glass" style={{ padding: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', textTransform: 'uppercase', color: log.type === 'email' ? '#10b981' : '#3b82f6' }}>
                      {log.type} ({log.status})
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {log.subject && <div style={{ fontWeight: '500' }}>Subject: {log.subject}</div>}
                  <div 
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      background: 'rgba(0,0,0,0.2)', 
                      padding: '6px', 
                      borderRadius: '4px', 
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      maxHeight: '100px',
                      overflowY: 'auto'
                    }}
                  >
                    {log.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
