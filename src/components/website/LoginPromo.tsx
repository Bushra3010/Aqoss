import Link from 'next/link';

/**
 * Sign-in prompt shown to anonymous visitors (PRD §11).
 *
 * The field posts through to the normal login page rather than starting its
 * own flow — one auth path, not two.
 */
export function LoginPromo() {
  return (
    <section className="mt-8 rounded-xl bg-[var(--brand-50)] p-5">
      <h2 className="text-base font-bold text-slate-900">
        Login to unlock deals &amp; manage your bookings!
      </h2>

      <form action="/login" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="promo-mobile" className="block text-sm text-slate-600">
            Mobile Number
          </label>
          <input
            id="promo-mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            placeholder="+91"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg border-2 border-green-700 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-green-700 transition hover:bg-green-700 hover:text-white"
        >
          Login Now
        </button>
      </form>

      <p className="mt-3 text-sm text-slate-600">
        New to this hotel?{' '}
        <Link href="/register" className="font-medium" style={{ color: 'var(--brand-700)' }}>
          Create an Account
        </Link>
      </p>
    </section>
  );
}
