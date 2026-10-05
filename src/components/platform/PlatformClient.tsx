'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { BedDouble, Building2, CheckCircle2, ChevronDown, Lock, Mail, MapPin, Menu, PencilLine, Phone, Send, User, X } from 'lucide-react';
import { submitDemoRequest, type DemoFormState } from '@/app/platform/actions';
import { AqossMark } from '@/components/platform/Art';
import { cn } from '@/lib/utils';
import { ABOUT, HEADER_NAV, RESOURCES } from '@/components/platform/nav';

export function PlatformHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) setResourcesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setResourcesOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const link = 'whitespace-nowrap text-[15px] font-medium text-slate-700 hover:text-blue-700';

  return (
    // On phones the bar floats as a rounded card over the page (the home hero
    // runs up behind it); from sm it is a full-width bar.
    <header className="sticky top-0 z-40 max-sm:px-3 max-sm:pt-2 sm:border-b sm:border-slate-200/80 sm:bg-white/95 sm:backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-6 px-4 max-sm:h-16 max-sm:rounded-2xl max-sm:bg-white max-sm:shadow-lg max-sm:shadow-slate-900/10 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="AQOSS home">
          <AqossMark className="h-9 w-auto" />
          <span className="text-[22px] font-extrabold tracking-tight text-[#003358]">AQOSS</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 xl:flex">
          {HEADER_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cn(link, pathname === item.href && 'text-blue-700')} aria-current={pathname === item.href ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={resourcesRef}>
            <button
              type="button"
              className={cn(link, 'flex items-center gap-1')}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              onClick={() => setResourcesOpen((o) => !o)}
            >
              Resources
              <ChevronDown className={cn('h-4 w-4 transition', resourcesOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {resourcesOpen ? (
              <div className="absolute left-1/2 top-full z-50 mt-4 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {RESOURCES.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setResourcesOpen(false)}
                    className="block rounded-lg px-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.text}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <Link href={ABOUT.href} className={cn(link, pathname === ABOUT.href && 'text-blue-700')} aria-current={pathname === ABOUT.href ? 'page' : undefined}>
            {ABOUT.label}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-6">
          <Link href="/admin/login" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-semibold text-[#0F172A] hover:bg-slate-100 sm:inline-flex">
            Hotel Sign In
          </Link>
          <a href="/#book-demo" className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm hover:bg-blue-800">
            Book a Demo
          </a>
          <button
            type="button"
            className="rounded-lg p-2 text-blue-700 hover:bg-blue-50 xl:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav aria-label="Main" className="max-h-[calc(100vh-68px)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 max-sm:mt-2 max-sm:rounded-2xl max-sm:border-0 max-sm:shadow-lg xl:hidden">
          {[...HEADER_NAV, ...RESOURCES, ABOUT].map((item) => (
            <a key={item.href + item.label} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {item.label}
            </a>
          ))}
          <Link href="/admin/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-slate-50">
            Hotel Sign In
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

const INTERESTS = [
  ['website', 'AI Website'],
  ['marketing', 'AI Marketing'],
  ['sales', 'AI Sales'],
  ['booking', 'AI Booking Engine'],
  ['reputation', 'AI Reputation Management'],
] as const;

/** "Book a demo" — saved for the AQOSS team, who see it in the CRM. */
export function DemoRequestForm() {
  const [state, action] = useFormState<DemoFormState, FormData>(submitDemoRequest, {});
  const err = (name: string) => state.fieldErrors?.[name];

  if (state.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-2xl shadow-slate-900/10" role="status">
        <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold text-[#0B1B3F]">Thank you — your demo request is in.</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500">Our team will contact you to set up a time that suits you.</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8" noValidate>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Send className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-2xl font-bold text-[#0B1B3F]">Get in Touch</h3>
          <p className="mt-1 text-sm text-slate-500">
            Fill out the form below and our team will get back to you shortly. We&apos;d love to hear from you!
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {state.error}
        </p>
      ) : null}

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field name="name" label="Your Name" required icon={User} placeholder="Enter your full name" error={err('name')} autoComplete="name" />
        <Field name="hotel_name" label="Hotel Name" required icon={Building2} placeholder="Enter your hotel name" error={err('hotel_name')} autoComplete="organization" />
        <Field name="email" type="email" label="Email" required icon={Mail} placeholder="you@hotel.com" error={err('email')} autoComplete="email" />
        <Field name="phone" type="tel" label="Phone" required icon={Phone} placeholder="+91 98765 43210" error={err('phone')} autoComplete="tel" />
        <Field name="city" label="City" icon={MapPin} placeholder="Enter your city" error={err('city')} autoComplete="address-level2" />
        <Field name="rooms" type="number" label="Number of Rooms" icon={BedDouble} placeholder="e.g. 40" error={err('rooms')} min={1} inputMode="numeric" />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-slate-700">Interested in</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERESTS.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/60"
            >
              <input type="checkbox" name="interests" value={value} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-slate-700">Anything else we should know?</span>
        <span className="relative mt-1.5 block">
          <PencilLine className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
          <textarea
            name="message"
            rows={3}
            maxLength={1500}
            placeholder="Tell us about your hotel or specific requirements..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </span>
      </label>

      <SubmitButton />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        We only use this information to arrange your demo.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  icon: Icon,
  error,
  ...props
}: {
  name: string;
  label: string;
  required?: boolean;
  icon: typeof User;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <span className="relative mt-1.5 block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name={name}
          aria-invalid={Boolean(error)}
          aria-required={required}
          className={cn(
            'w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2',
            error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20',
          )}
          {...props}
        />
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800 disabled:opacity-60"
    >
      <Send className="h-4 w-4" aria-hidden="true" />
      {pending ? 'Sending…' : 'Book my demo'}
    </button>
  );
}
