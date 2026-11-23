import type { Metadata } from 'next';
import Link from 'next/link';
import { OwnerSignup } from '@/components/admin/listing/OwnerSignup';
import { AqossMark } from '@/components/platform/Art';

export const metadata: Metadata = { title: 'List your property · AQOSS' };

/**
 * "List your property" for owners. Public, like /admin/login (middleware lets
 * both through signed out); it sits outside both CRM shells. Signing up
 * creates the owner's login and a draft listing that only AQOSS can put live.
 */
export default function ListYourPropertyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="AQOSS home">
            <AqossMark className="h-9 w-auto" />
            <span className="text-[22px] font-extrabold tracking-tight text-[#003358]">AQOSS</span>
          </Link>
          <p className="text-sm text-slate-600">
            Already listed?{' '}
            <Link href="/admin/login" className="font-semibold text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">List your property</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Get a free website with online booking for your hotel, homestay or villa. Fill in the details step by step —
          our team checks the listing and puts it live.
        </p>
        <div className="mt-6">
          <OwnerSignup />
        </div>
      </main>
    </div>
  );
}
