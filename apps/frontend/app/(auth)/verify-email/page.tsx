'use client';

/**
 * /verify-email?token=<token> page
 *
 * Wraps the verification content in Suspense to support useSearchParams in Next.js static generation.
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../features/auth/useAuth';

type State = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { verifyEmail } = useAuth();

  const [state, setState] = useState<State>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrMsg('No verification token found in the link. Please check your email and try the link again.');
      setState('error');
      return;
    }

    let cancelled = false;

    verifyEmail(token)
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch((err) => {
        if (!cancelled) {
          setErrMsg(err?.message || 'The verification link has expired or is invalid. Please request a new one.');
          setState('error');
        }
      });

    return () => { cancelled = true; };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-spinner-large" role="status" aria-label="Verifying email…" />
        <h1 className="auth-title" style={{ marginTop: '1.5rem' }}>Verifying your email…</h1>
        <p className="auth-subtitle">Just a moment, hang tight.</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-success-icon">✓</div>
        <h1 className="auth-title">Email verified!</h1>
        <p className="auth-subtitle">
          Your account is now active. Start learning system design.
        </p>
        <Link
          href="/login"
          className="auth-submit-btn"
          style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}
        >
          Sign In to SD-OS
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-card--center">
      <div className="auth-success-icon" style={{ color: '#ef4444' }}>✕</div>
      <h1 className="auth-title">Verification failed</h1>
      <p className="auth-subtitle">{errMsg}</p>
      <Link
        href="/forgot-password"
        className="auth-submit-btn"
        style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}
      >
        Request New Link
      </Link>
      <p className="auth-footer" style={{ marginTop: '1rem' }}>
        Already verified?{' '}
        <Link href="/login" className="auth-footer-link">Sign in</Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="auth-card auth-card--center">
        <div className="auth-spinner-large" role="status" aria-label="Loading page…" />
        <h1 className="auth-title" style={{ marginTop: '1.5rem' }}>Loading…</h1>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
