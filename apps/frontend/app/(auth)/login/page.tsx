'use client';

/**
 * /login page
 *
 * Connects to authService.login() → stores JWT in Zustand → redirects to /dashboard.
 * Features:
 *   - Real-time Zod validation on blur
 *   - Loading spinner during request
 *   - Server error display (wrong credentials, account locked)
 *   - "Forgot password" link
 *   - Google OAuth placeholder (Part 5)
 */

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../features/auth/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Client-side field validation before network call
  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!email.includes('@')) errs.email = 'Enter a valid email address.';
    if (password.length < 8)  errs.password = 'Password must be at least 8 characters.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // `error` from useAuth hook already holds the message
    }
  }

  return (
    <div className="auth-card">

      {/* Heading */}
      <div className="auth-heading">
        <div className="auth-logo">⚙</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your SD-OS workspace</p>
      </div>

      {/* Server error banner */}
      {error && (
        <div className="auth-error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>

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
          <div className="form-label-row">
            <label htmlFor="password" className="form-label">Password</label>
            <Link href="/forgot-password" className="form-label-link">Forgot password?</Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={validate}
            placeholder="••••••••"
            className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
          />
          {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-submit-btn"
        >
          {loading ? <span className="spinner" /> : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="auth-divider"><span>or</span></div>

      {/* OAuth (wired in Part 5) */}
      <button className="oauth-btn" type="button" disabled>
        <span className="oauth-icon">G</span>
        Continue with Google
      </button>

      {/* Footer link */}
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="auth-footer-link">Create one free</Link>
      </p>
    </div>
  );
}
