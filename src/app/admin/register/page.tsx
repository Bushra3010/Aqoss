import type { Metadata } from 'next';
import Link from 'next/link';
import { HotelRegisterForm } from '@/components/admin/HotelRegisterForm';

export const metadata: Metadata = { title: 'AQOSS CRM · Register your hotel' };

/**
 * Public, like /admin/login (middleware lets both through signed out). It
 * sits outside both CRM shells and reaches no data — it only submits a form.
 */
export default function HotelRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#003358]" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/aqoss-mark-white.png" alt="" className="h-[62%] w-auto" />
          </span>
          <p className="text-2xl font-bold text-white">AQOSS</p>
          <p className="text-sm text-slate-400">Hotel management CRM</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">Register your hotel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about your property. Once our team approves it, we set up your hotel and send you your sign-in.
          </p>
          <HotelRegisterForm />
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/admin/login" className="font-semibold text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
