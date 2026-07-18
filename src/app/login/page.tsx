'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleSendMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (otpError) throw otpError;
      setOtpSent(true);
      setSuccessMsg('Check your email! We sent you a secure sign-in link.');
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <style>{`
        @keyframes float-in {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-card {
          animation: float-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all 0.25s ease;
        }
        .login-input:focus {
          border-color: var(--color-accent-primary);
          box-shadow: 0 0 0 3px rgba(29, 143, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }
        .login-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          background: var(--primary-gradient);
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 4px rgba(0, 0, 0, 0.25);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-20deg);
          transition: left 0.6s ease;
          z-index: 1;
        }
        .login-btn:hover:not(:disabled)::before {
          left: 150%;
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-1.5px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .login-btn:active:not(:disabled) {
          filter: brightness(0.92);
          transform: translateY(0);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        .login-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
        .login-btn.loading {
          background: linear-gradient(90deg, rgba(29,143,255,0.6) 0%, rgba(29,143,255,1) 50%, rgba(29,143,255,0.6) 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
        }
        .otp-input {
          width: 100%;
          padding: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          letter-spacing: 8px;
          outline: none;
          transition: all 0.25s ease;
        }
        .otp-input:focus {
          border-color: var(--color-accent-primary);
          box-shadow: 0 0 0 3px rgba(29, 143, 255, 0.15);
        }
        .back-link {
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--color-accent-primary); }
      `}</style>

      <div className="login-card" style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '48px 36px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255,255,255,0.1) inset',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <img 
              src="/icon.svg" 
              alt="Creator Match Logo" 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%'
              }} 
            />
            <span style={{
              fontSize: '22px',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
            }}>
              Creator Match
            </span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            lineHeight: '1.2'
          }}>
            {otpSent ? 'Check your email' : 'Welcome to Creator Match'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            lineHeight: '1.4'
          }}>
            {otpSent ? 'We sent a secure login link to your inbox.' : 'Discover creators, manage outreach, and track campaigns in one workspace.'}
          </p>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(240, 68, 56, 0.1)',
            border: '1px solid rgba(240, 68, 56, 0.2)',
            borderRadius: '8px',
            color: '#F04438',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(18, 183, 106, 0.1)',
            border: '1px solid rgba(18, 183, 106, 0.2)',
            borderRadius: '8px',
            color: '#12B76A',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            {successMsg}
          </div>
        )}

        {/* Step 1: Email Input */}
        {!otpSent && (
          <form onSubmit={handleSendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="login-input"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`login-btn ${loading ? 'loading' : ''}`}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Continuing...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: Magic Link Sent Confirmation */}
        {otpSent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                We sent a secure sign-in link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
                Please click the link in your email to automatically log in.
              </p>
            </div>
            
            <button
              onClick={() => handleSendMagicLink()}
              disabled={loading}
              className={`login-btn ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Resending link...' : 'Resend Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                className="back-link"
                onClick={() => { setOtpSent(false); setError(''); setSuccessMsg(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ← Use a different email
              </button>
            </div>
          </div>
        )}

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            Continue as Guest
          </button>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
            Guest sessions are temporary and won't be saved.
          </p>
        </div>
      </div>
    </div>
  );
}
