'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Creator {
  id: string;
  handle: string;
  name: string;
  email: string | null;
  followers_count: number;
  engagement_rate: number | null;
  location: string | null;
  niche: string;
  bio: string | null;
  recent_posts: any[] | null;
}

interface OutreachModalProps {
  creator: Creator | null;
  onClose: () => void;
  onStatusUpdate: () => void;
}

const COLLAB_TYPES = [
  { value: 'Sponsored post', label: 'Sponsored Post' },
  { value: 'Affiliate campaign', label: 'Affiliate Campaign' },
  { value: 'UGC creation', label: 'UGC Content Creation' },
  { value: 'Brand ambassador', label: 'Brand Ambassador' },
  { value: 'Paid promotion', label: 'Paid Promotion' },
  { value: 'Barter collaboration', label: 'Barter Collab' },
];

export default function OutreachModal({ creator, onClose, onStatusUpdate }: OutreachModalProps) {
  const [collabType, setCollabType] = useState('Sponsored post');
  const [loading, setLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [dmBody, setDmBody] = useState('');
  
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedDm, setCopiedDm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (creator) {
      handleGenerate();
    }
  }, [creator, collabType]);

  const handleGenerate = async () => {
    if (!creator) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setEmailBody('');
    setEmailSubject('');
    setDmBody('');

    try {
      const response = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: creator.id,
          collabType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate outreach: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setEmailSubject(data.emailSubject || `Collaboration opportunity with @${creator.handle}`);
      setEmailBody(data.emailBody || '');
      setDmBody(data.dmBody || '');

      // Update outreach status to draft_created if status is uncontacted
      const { error: updateError } = await supabase
        .from('influencers')
        .update({ outreach_status: 'draft_created' })
        .eq('id', creator.id)
        .eq('outreach_status', 'uncontacted');

      if (updateError) console.warn('Status update failed:', updateError);
      onStatusUpdate();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while generating outreach');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!creator || !creator.email) return;
    setSendingEmail(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/outreach/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: creator.id,
          subject: emailSubject,
          body: emailBody,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setSuccessMsg('Email sent successfully!');
      onStatusUpdate();

    } catch (err: any) {
      setErrorMsg(err.message || 'SMTP delivery failed. Please check app settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyDm = async () => {
    if (!creator || !dmBody) return;
    try {
      await navigator.clipboard.writeText(dmBody);
      setCopiedDm(true);
      setTimeout(() => setCopiedDm(false), 2000);

      // Create outreach log in database
      const { error: logError } = await supabase.from('outreach_logs').insert({
        influencer_id: creator.id,
        type: 'dm',
        content: dmBody,
        status: 'sent',
      });

      if (logError) console.warn('Error logging DM:', logError);

      // Update influencer status to dm_copied
      const { error: updateError } = await supabase
        .from('influencers')
        .update({ outreach_status: 'dm_copied' })
        .eq('id', creator.id);

      if (updateError) console.warn('Error updating status:', updateError);
      
      setSuccessMsg('DM copied to clipboard and status updated!');
      onStatusUpdate();

    } catch (err: any) {
      console.warn('Failed to copy to clipboard:', err.message || err);
    }
  };

  if (!creator) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Personalized Outreach for {creator.name}</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Close</button>
        </div>

        {/* Filters / Params */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="input-group">
            <span className="input-label">Niche</span>
            <input type="text" className="input-field" value={creator.niche} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="input-group">
            <span className="input-label">Collaboration Type</span>
            <select 
              value={collabType} 
              onChange={(e) => setCollabType(e.target.value)} 
              className="input-field"
              disabled={loading}
              style={{ background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
            >
              {COLLAB_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '10px', fontSize: '13px' }}>
            ⚠ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '10px', fontSize: '13px' }}>
            ✔ {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Personalizing copy using Gemini AI...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email Outreach Block */}
            <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>Personalized Email Proposal (60-90 words)</h4>
                {creator.email ? (
                  <button 
                    onClick={handleSendEmail} 
                    className="btn btn-primary" 
                    disabled={sendingEmail || !emailBody}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {sendingEmail ? 'Sending...' : 'Send via SMTP'}
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No email address available</span>
                )}
              </div>
              <div className="input-group">
                <span className="input-label" style={{ fontSize: '10px' }}>Subject</span>
                <input 
                  type="text" 
                  className="input-field" 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <span className="input-label" style={{ fontSize: '10px' }}>Email Body</span>
                <textarea 
                  className="input-field" 
                  value={emailBody} 
                  onChange={(e) => setEmailBody(e.target.value)} 
                  rows={6}
                  style={{ resize: 'vertical', lineHeight: '1.4', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* DM Outreach Block */}
            <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>Instagram DM Pitch (15-30 words)</h4>
                <button 
                  onClick={handleCopyDm} 
                  className="btn btn-secondary" 
                  disabled={!dmBody}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  {copiedDm ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              <div className="input-group">
                <span className="input-label" style={{ fontSize: '10px' }}>DM Message</span>
                <textarea 
                  className="input-field" 
                  value={dmBody} 
                  onChange={(e) => setDmBody(e.target.value)} 
                  rows={3}
                  style={{ resize: 'vertical', lineHeight: '1.4', fontSize: '13px' }}
                />
              </div>
            </div>
            
            <button 
              onClick={handleGenerate}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Regenerate Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
