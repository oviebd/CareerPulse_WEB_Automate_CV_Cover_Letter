'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage } from '@/lib/auth-errors';
import { safeRedirectPath } from '@/lib/redirect';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({
  returnTo,
  urlError,
}: {
  returnTo?: string;
  urlError?: string;
}) {
  const router = useRouter();
  const safeNext = safeRedirectPath(returnTo);
  const callbackUrl = `${appUrl}/api/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? authErrorMessage(urlError) : null
  );
  const [magicSent, setMagicSent] = useState(false);

  const onGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });
    setLoading(false);
    if (err) setError(authErrorMessage(err.message));
  }, [callbackUrl]);

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    router.push(safeNext);
    router.refresh();
  };

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMagicSent(false);
    setMagicLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: callbackUrl },
    });
    setMagicLoading(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    setMagicSent(true);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Sign in to continue to your dashboard.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-[var(--color-accent-coral)]/40 bg-[var(--color-accent-coral)]/10 px-4 py-3 text-sm text-[var(--color-accent-coral)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void onGoogle()}
        disabled={loading || magicLoading}
        className="flex w-full items-center justify-center gap-3 rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-[var(--color-background)] px-2 text-[var(--color-muted)]">
            Or with email
          </span>
        </div>
      </div>

      <form onSubmit={onEmailSignIn} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-[var(--color-primary)] transition placeholder:text-[var(--color-muted)] focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-[var(--color-primary)] transition placeholder:text-[var(--color-muted)] focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading || magicLoading}
          className="w-full rounded-btn bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="border-t border-[var(--color-border)] pt-6">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Magic link
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          We&apos;ll email you a one-time sign-in link.
        </p>
        <form onSubmit={onMagicLink} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="you@example.com"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            required
            className="flex-1 rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-muted)] focus:ring-2"
          />
          <button
            type="submit"
            disabled={magicLoading || loading}
            className="rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-hover-surface)] disabled:opacity-60"
          >
            {magicLoading ? 'Sending…' : 'Email link'}
          </button>
        </form>
        {magicSent ? (
          <p className="mt-2 text-sm text-[var(--color-success)]">
            Check your inbox for the sign-in link.
          </p>
        ) : null}
      </div>

      <p className="text-center text-sm text-[var(--color-muted)]">
        No account?{' '}
        <Link
          href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
