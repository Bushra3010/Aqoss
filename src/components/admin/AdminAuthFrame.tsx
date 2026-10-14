/** The dark CRM frame around the signed-out screens: sign in and password reset. */
export function AdminAuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#003358]" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/aqoss-mark-white.png" alt="" className="h-[62%] w-auto" />
          </span>
          <p className="text-2xl font-bold text-white">AQOSS</p>
          <p className="text-sm text-slate-400">Hotel management CRM</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}
