import type { Metadata } from 'next';
import { env, isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Set up AQOSS Hotel' };

/**
 * Shown when the app is running without Supabase credentials.
 *
 * Every page in this platform reads from the database, so there is nothing
 * meaningful to render until a project is connected. Rather than throwing a
 * stack trace at whoever just cloned the repo, middleware routes them here.
 */
export default function SetupPage() {
  const missing = [
    !env.supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !env.supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            AQOSS Hotel
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Connect a Supabase project
          </h1>
          <p className="mt-3 text-slate-600">
            The dev server is running. Every page here — hotel websites, the booking engine, the
            CRM — reads from the database, so there is nothing to show until a project is
            connected.
          </p>
        </header>

        {isSupabaseConfigured ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Credentials are set. Restart the dev server to pick them up.
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Missing environment variables</p>
            <ul className="mt-1.5 list-inside list-disc">
              {missing.map((key) => (
                <li key={key}>
                  <code className="text-xs">{key}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="mt-8 space-y-6">
          <Step n={1} title="Create a Supabase project">
            <p>
              At{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline"
              >
                supabase.com/dashboard
              </a>
              . The free tier is enough for development.
            </p>
          </Step>

          <Step n={2} title="Copy three values into .env.local">
            <p>
              From <span className="font-medium">Project Settings → API</span>:
            </p>
            <Pre>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...`}</Pre>
            <p className="text-xs text-slate-500">
              The service-role key bypasses row-level security. It is read only on the server and
              must never be committed or exposed to the browser.
            </p>
          </Step>

          <Step n={3} title="Apply the schema">
            <p>
              Run the ten files in <code className="text-xs">supabase/migrations/</code> in
              filename order — either with the CLI:
            </p>
            <Pre>{`supabase link --project-ref <your-ref>
supabase db push`}</Pre>
            <p>…or by pasting each file into the Supabase SQL editor, oldest first.</p>
          </Step>

          <Step n={4} title="Seed the demo data">
            <Pre>{`npm run seed -- --count=6   # quick
npm run seed                # all 52 hotels`}</Pre>
            <p>
              The seeder prints a URL for each hotel. Restart the dev server, then open any of
              them.
            </p>
          </Step>

          <Step n={5} title="Give yourself CRM access">
            <p>
              Register at <code className="text-xs">/register</code>, then in the SQL editor:
            </p>
            <Pre>{`insert into public.admin_users (profile_id, role_id)
select p.id, r.id
from public.profiles p, public.roles r
where p.email = 'you@example.com'
  and r.key = 'super_admin';`}</Pre>
          </Step>
        </ol>

        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Once it is connected</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="A hotel website" value={`http://<slug>.${env.rootDomain}`} />
            <Row label="The CRM" value={`${env.appUrl}/admin`} />
            <Row label="Customer dashboard" value={`${env.appUrl}/dashboard`} />
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            To serve one hotel on plain localhost, set{' '}
            <code>DEFAULT_WEBSITE_SLUG</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <div className="mt-1.5 space-y-2 text-sm text-slate-600">{children}</div>
      </div>
    </li>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-xs text-slate-900">{value}</dd>
    </div>
  );
}
