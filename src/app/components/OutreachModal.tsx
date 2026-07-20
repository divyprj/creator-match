'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { Creator, AppSettings } from '@/types';


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

  // Gemini auto-fire prevention state
  const [copyGenerated, setCopyGenerated] = useState(false);

  useEffect(() => {
    // If the copy has already been generated once, auto-update it when collabType changes
    if (copyGenerated && creator) {
      handleGenerate();
    }
  }, [collabType]);

  const handleGenerate = async () => {
    if (!creator) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setEmailBody('');
    setEmailSubject('');
    setDmBody('');

    try {
      // Load local credentials/SMTP settings from localStorage
      let localSettings = null;
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('creator_match_settings');
        if (local) {
          try {
            localSettings = JSON.parse(local);
          } catch (e) {
            console.warn('Failed to parse localStorage settings', e);
          }
        }
      }

      const response = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: creator.id,
          collabType,
          settings: localSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate outreach: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setEmailSubject(data.emailSubject || `Collaboration opportunity with @${creator.handle}`);
      setEmailBody(data.emailBody || '');
      setDmBody(data.dmBody || '');
      setCopyGenerated(true);

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
      // Load local credentials/SMTP settings from localStorage
      let localSettings = null;
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('creator_match_settings');
        if (local) {
          try {
            localSettings = JSON.parse(local);
          } catch (e) {
            console.warn('Failed to parse localStorage settings', e);
          }
        }
      }

      const response = await fetch('/api/outreach/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: creator.id,
          subject: emailSubject,
          body: emailBody,
          settings: localSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send email: HTTP ${response.status}`);
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
            <label htmlFor="outreach-niche" className="input-label">Niche</label>
            <input id="outreach-niche" type="text" className="input-field" value={creator.niche} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="input-group">
            <label htmlFor="outreach-collab-type" className="input-label">Collaboration Type</label>
            <select 
              id="outreach-collab-type"
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
          <div style={{ background: 'var(--color-status-error-bg)', color: '#fca5a5', border: '1px solid var(--color-status-error)', borderRadius: '6px', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }} aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'var(--color-status-success-bg)', color: '#12b76a', border: '1px solid var(--color-status-success)', borderRadius: '6px', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }} aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Personalizing copy using Gemini AI...</span>
          </div>
        ) : !copyGenerated ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed var(--card-border)', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(56, 151, 245, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-accent-primary)' }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div>
              <h4 style={{ fontWeight: '600', fontSize: '15px' }}>Outreach Copy Ready to Generate</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '380px' }}>
                Use Gemini AI to craft a highly personalized email & Instagram DM proposal using this creator's recent content.
              </p>
            </div>
            <button 
              onClick={handleGenerate}
              className="btn btn-primary"
              style={{ padding: '10px 24px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>
              </svg>
              Generate Copy with Gemini
            </button>
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
                <label htmlFor="outreach-email-subject" className="input-label" style={{ fontSize: '10px' }}>Subject</label>
                <input 
                  id="outreach-email-subject"
                  type="text" 
                  className="input-field" 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <label htmlFor="outreach-email-body" className="input-label" style={{ fontSize: '10px' }}>Email Body</label>
                <textarea 
                  id="outreach-email-body"
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
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-accent-secondary)' }}>Instagram DM Pitch (15-30 words)</h4>
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
                <label htmlFor="outreach-dm-body" className="input-label" style={{ fontSize: '10px' }}>DM Message</label>
                <textarea 
                  id="outreach-dm-body"
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
