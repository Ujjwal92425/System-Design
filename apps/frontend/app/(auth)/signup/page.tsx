'use client';

/**
 * /signup page
 *
 * Calls authService.register() → server creates user + email verification token.
 * After success, redirects to a confirmation screen.
 * Password strength meter provides instant UX feedback.
 */

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../features/auth/useAuth';
import { analytics } from '../../../lib/analytics';

// Very simple password strength scorer (0-4)
function scorePassword(pw: string): number {
  let score = 0;
  if (pw.length >= 8)                      score++;
  if (/[A-Z]/.test(pw))                    score++;
  if (/[0-9]/.test(pw))                    score++;
  if (/[^A-Za-z0-9]/.test(pw))            score++;
  return score;
}

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading, error } = useAuth();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone]         = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const strength = scorePassword(password);

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (name.trim().length < 2)      errs.name = 'Name must be at least 2 characters.';
    if (!email.includes('@'))        errs.email = 'Enter a valid email address.';
    if (password.length < 8)         errs.password = 'Password must be at least 8 characters.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await signup(email, password, name);
      analytics.track('signup:completed', { email, name });
      setDone(true);
    } catch {
      analytics.track('signup:failed', { email });
    }
  }

  // ── Post-signup confirmation screen ─────────────────────────────────────────
  if (done) {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-success-icon">✉</div>
        <h1 className="auth-title">Check your inbox</h1>
        <p className="auth-subtitle">
          We sent a verification link to <strong>{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link href="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}>
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">

      <div className="auth-heading">
        <div className="auth-logo">⚙</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start learning system design for free</p>
      </div>

      {error && <div className="auth-error-banner" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>

        <div className="form-group">
          <label htmlFor="name" className="form-label">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={validate}
            placeholder="Ada Lovelace"
            className={`form-input${fieldErrors.name ? ' form-input--error' : ''}`}
          />
          {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={validate}
            placeholder="you@example.com"
            className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
          />
          {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
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
          {/* Password strength meter */}
          {password.length > 0 && (
            <div className="strength-meter" aria-label={`Password strength: ${STRENGTH_LABELS[strength]}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="strength-segment"
                  style={{ backgroundColor: i < strength ? STRENGTH_COLORS[strength] : '#e4e4e7' }}
                />
              ))}
              <span className="strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}
          {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn" data-track="signup:submit">
          {loading ? <span className="spinner" /> : 'Create Account'}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>
      <button className="oauth-btn" type="button" disabled data-track="signup:google_oauth">
        <span className="oauth-icon">G</span>
        Continue with Google
      </button>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link href="/login" className="auth-footer-link">Sign in</Link>
      </p>
    </div>
  );
}
