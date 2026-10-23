'use client';

/**
 * /forgot-password page
 *
 * Submits email → backend creates reset token + queues email.
 * Shows a confirmation message regardless of whether the email exists
 * (prevents user enumeration — AUTH-05).
 */

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../features/auth/useAuth';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error } = useAuth();

  const [email, setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState('');

  function validate(): boolean {
    if (!email.includes('@')) {
      setFieldError('Please enter a valid email address.');
      return false;
    }
    setFieldError('');
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await forgotPassword(email);
      // Always show success — even for non-existent email (anti-enumeration)
      setSubmitted(true);
    } catch {
      // error is captured in useAuth
    }
  }

  if (submitted) {
    return (
      <div className="auth-card auth-card--center">
        <div className="auth-success-icon">✉</div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          If <strong>{email}</strong> is registered, you&apos;ll receive a password
          reset link within a few minutes.
        </p>
        <p className="auth-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
          Didn&apos;t get it? Check your spam folder or{' '}
          <button
            className="auth-footer-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setSubmitted(false)}
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="auth-submit-btn"
          style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <div className="auth-logo">🔑</div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && <div className="auth-error-banner" role="alert">{error}</div>}

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
            className={`form-input${fieldError ? ' form-input--error' : ''}`}
          />
          {fieldError && <p className="form-error">{fieldError}</p>}
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? <span className="spinner" /> : 'Send Reset Link'}
        </button>
      </form>

      <p className="auth-footer">
        Remembered it?{' '}
        <Link href="/login" className="auth-footer-link">Sign in</Link>
      </p>
    </div>
  );
}
