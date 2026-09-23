import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/website/AuthForms';

export const metadata: Metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Book faster and keep every stay in one place.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
