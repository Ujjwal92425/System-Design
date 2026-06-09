'use client';

/**
 * /reset-password?token=<token> page
 *
 * Wraps the reset content in Suspense to support useSearchParams in Next.js static generation.
 */

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../features/auth/useAuth';

function scorePassword(pw: string): number {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return score;
}

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { resetPassword, loading, error } = useAuth();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [done, setDone]           = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const strength = scorePassword(password);

  // Missing or clearly invalid token
  if (!token) {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-success-icon" style={{ color: '#ef4444' }}>✕</div>
        <h1 className="auth-title">Invalid link</h1>
        <p className="auth-subtitle">
          This password reset link is missing a token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}>
          Request New Link
        </Link>
      </div>
    );
  }

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (password.length < 8)       errs.password = 'Password must be at least 8 characters.';
    if (password !== confirm)       errs.confirm = 'Passwords do not match.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch {
      // error captured in useAuth
    }
  }

  if (done) {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-success-icon">✓</div>
        <h1 className="auth-title">Password updated</h1>
        <p className="auth-subtitle">
          Your password has been reset successfully. You can now sign in with your new credentials.
        </p>
        <Link href="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <div className="auth-logo">🔒</div>
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-subtitle">Make it strong — you won&apos;t need to remember it with a good manager.</p>
      </div>

      {error && <div className="auth-error-banner" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>

        <div className="form-group">
          <label htmlFor="password" className="form-label">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={validate}
            placeholder="Min. 8 characters"
            className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
          />
          {password.length > 0 && (
            <div className="strength-meter" aria-label={`Password strength: ${STRENGTH_LABELS[strength]}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="strength-segment"
                  style={{ backgroundColor: i < strength ? STRENGTH_COLORS[strength] : '#27272a' }}
                />
              ))}
              <span className="strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}
          {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="confirm" className="form-label">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={validate}
            placeholder="Repeat your password"
            className={`form-input${fieldErrors.confirm ? ' form-input--error' : ''}`}
          />
          {fieldErrors.confirm && <p className="form-error">{fieldErrors.confirm}</p>}
        </div>

        <button type="submit" disabled={loading || strength < 1} className="auth-submit-btn">
          {loading ? <span className="spinner" /> : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-card auth-card--center">
        <div className="auth-spinner-large" role="status" aria-label="Loading page…" />
        <h1 className="auth-title" style={{ marginTop: '1.5rem' }}>Loading…</h1>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
