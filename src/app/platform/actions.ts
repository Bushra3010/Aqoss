'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { toApiError } from '@/lib/api';
import { createDemoRequest, DEMO_INTERESTS } from '@/services/demo-request.service';

export type DemoFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string({ required_error: 'Enter your name.' }).trim().min(2, 'Enter your name.').max(120),
  hotel_name: z.string({ required_error: "Enter your hotel's name." }).trim().min(2, "Enter your hotel's name.").max(160),
  email: z.string({ required_error: 'Enter your email.' }).trim().toLowerCase().email('Enter a valid email.'),
  phone: z.string({ required_error: 'Enter a phone number.' }).trim().regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number.'),
  city: z.string().trim().max(80).nullish(),
  rooms: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int().min(1).max(10000).nullish(),
  interests: z.array(z.enum(DEMO_INTERESTS.map(([k]) => k) as [string, ...string[]])).max(5).default([]),
  message: z.string().trim().max(1500).nullish(),
});

/**
 * At most a handful of requests per address per hour. In memory per server
 * instance — enough to stop a script hammering the form, not a security wall.
 */
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
const KEY = Symbol.for('aqoss.demoRequests.rate');
type G = typeof globalThis & { [KEY]?: Map<string, number[]> };

function tooMany(ip: string): boolean {
  const g = globalThis as G;
  const hits: Map<string, number[]> = (g[KEY] ??= new Map<string, number[]>());
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t: number) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  hits.set(ip, [...recent, now]);
  return false;
}

/** "Book a demo" on the AQOSS website. Public: validated, rate-limited, honeypot-guarded. */
export async function submitDemoRequest(_prev: DemoFormState, formData: FormData): Promise<DemoFormState> {
  try {
    // A field people never see; bots fill every input. Pretend success.
    if (String(formData.get('website_url') ?? '').trim()) return { ok: true };

    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || headers().get('x-real-ip') || 'unknown';
    if (tooMany(ip)) return { error: 'Thanks — we already have your requests. Please try again later or call us.' };

    const blank = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() === '' ? undefined : v ?? undefined);
    const parsed = schema.safeParse({
      name: blank(formData.get('name')),
      hotel_name: blank(formData.get('hotel_name')),
      email: blank(formData.get('email')),
      phone: blank(formData.get('phone')),
      city: blank(formData.get('city')),
      rooms: blank(formData.get('rooms')),
      interests: formData.getAll('interests').map(String),
      message: blank(formData.get('message')),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '');
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return { error: 'Please check the highlighted fields.', fieldErrors };
    }

    await createDemoRequest(parsed.data);
    return { ok: true };
  } catch (err) {
    return { error: toApiError(err).message };
  }
}
