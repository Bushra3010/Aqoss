'use client';

import { useState, useTransition } from 'react';
import { LogIn } from 'lucide-react';
import { demoSignIn } from '@/app/(auth)/actions';
import { Alert } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface DemoAccountOption {
  email: string;
  label: string;
  description: string;
}

/**
 * One-click sign-in for the seeded demo accounts.
 *
 * Only rendered when demo mode is on, and the server action re-checks that
 * before doing anything — this is a convenience, not an auth bypass.
 */
export function DemoSignIn({
  accounts,
  redirectTo,
  tone = 'light',
}: {
  accounts: DemoAccountOption[];
  redirectTo: string;
  tone?: 'light' | 'dark';
}) {
  const [pending, start] = useTransition();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!accounts.length) return null;

  function signIn(email: string) {
    setBusyEmail(email);
    setError(null);

    start(async () => {
      const result = await demoSignIn(email, redirectTo);
      // A successful sign-in redirects, so anything returned is a failure.
      if (result?.error) {
        setError(result.error);
        setBusyEmail(null);
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className={cn('h-px flex-1', tone === 'dark' ? 'bg-slate-700' : 'bg-slate-200')} />
        <span className={cn('text-xs font-medium', tone === 'dark' ? 'text-slate-400' : 'text-slate-400')}>
          or use a demo account
        </span>
        <span className={cn('h-px flex-1', tone === 'dark' ? 'bg-slate-700' : 'bg-slate-200')} />
      </div>

      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <ul className="mt-3 space-y-2">
        {accounts.map((account) => {
          const busy = pending && busyEmail === account.email;

          return (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => signIn(account.email)}
                disabled={pending}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-600"
                  aria-hidden="true"
                >
                  <LogIn className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{account.label}</span>
                  <span className="block truncate text-xs text-slate-400">{account.description}</span>
                </span>

                <span className="shrink-0 text-xs font-medium text-slate-400 group-hover:text-blue-600">
                  {busy ? 'Signing in…' : 'Sign in'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className={cn('mt-3 text-center text-xs', tone === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
        Demo data only. Every account uses the password{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-500">demo1234</code>.
      </p>
    </div>
  );
}
