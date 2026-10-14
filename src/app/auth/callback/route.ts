import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeLocalPath } from '@/lib/safe-path';

/** Where a dead link sends you: a reset link back to "send me another one". */
const EXPIRED: Record<string, string> = {
  '/reset-password': '/forgot-password',
  '/admin/reset-password': '/admin/forgot-password',
};

/**
 * Supabase Auth redirect target: exchanges the one-time code for a session
 * cookie, then sends the user on to wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // The Host header, not nextUrl.origin: that reports the server's own address,
  // which would send a guest from a hotel subdomain to the AQOSS main domain,
  // where their new session cookie doesn't exist.
  const host = request.headers.get('x-aqoss-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const origin = `${request.nextUrl.protocol}//${host}`;
  const code = searchParams.get('code');
  // Only ever redirect within this site.
  const next = safeLocalPath(searchParams.get('next'), '/dashboard');

  if (code) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${EXPIRED[next] ?? '/login'}?error=link_expired`);
}
