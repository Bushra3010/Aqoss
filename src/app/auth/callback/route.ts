import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Supabase Auth redirect target: exchanges the one-time code for a session
 * cookie, then sends the user on to wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only ever redirect within this site.
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/dashboard'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
