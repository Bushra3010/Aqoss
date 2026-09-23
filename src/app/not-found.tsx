import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 max-w-md text-slate-600">
          The page you are looking for does not exist, or the website has not been published yet.
        </p>
        <Link href="/" className="btn-outline mt-6">
          Back to home
        </Link>
      </div>
    </main>
  );
}
