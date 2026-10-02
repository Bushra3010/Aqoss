import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeLocalPath } from '@/lib/safe-path';

/** POST /auth/signout — ends the session (PRD §11). */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  // `next` lets "Sign in as someone else" land back on the sign-in form.
  const form = await request.formData().catch(() => null);
  const next = safeLocalPath(form?.get('next'), '/');
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
