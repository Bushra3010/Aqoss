import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabase } from '@/lib/supabase/middleware';
import { isDemoMode, isSupabaseConfigured } from '@/lib/env';
import { DEMO_SESSION_COOKIE } from '@/lib/demo/constants';

const PREVIEW_COOKIE = 'aqoss_preview_site';

/**
 * Runs on every request (PRD §38, §42):
 *   1. refreshes the Supabase session cookie
 *   2. forwards the hostname so pages and route handlers resolve the same tenant
 *   3. carries the requested preview slug for unpublished websites
 *   4. gates /admin and /dashboard behind authentication
 *
 * Note: the preview slug is only a *request*. Whether the caller may actually
 * see an unpublished website is decided in `getTenant()`, which verifies the
 * user is an active admin. Middleware never grants access on its own.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname, searchParams } = request.nextUrl;

  // Nothing in this app can render without data. Rather than failing on every
  // request, send whoever is running it to the setup instructions — unless demo
  // mode is on, which supplies its own in-memory dataset.
  if (!isSupabaseConfigured && !isDemoMode) {
    if (pathname === '/setup') return NextResponse.next();
    return NextResponse.rewrite(new URL('/setup', request.url));
  }

  const previewParam = searchParams.get('preview_site');
  const previewSlug = previewParam ?? request.cookies.get(PREVIEW_COOKIE)?.value ?? null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-aqoss-host', host);
  requestHeaders.set('x-aqoss-pathname', pathname);
  // Strip anything a client sent under our own header names.
  requestHeaders.delete('x-aqoss-preview-site');
  if (previewSlug) requestHeaders.set('x-aqoss-preview-site', previewSlug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (previewParam) {
    response.cookies.set(PREVIEW_COOKIE, previewParam, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
  }

  // In demo mode the session is a plain cookie, and middleware runs on the
  // edge — so read it directly rather than pulling in the demo client.
  let signedIn: boolean;

  if (isDemoMode) {
    signedIn = Boolean(request.cookies.get(DEMO_SESSION_COOKIE)?.value);
  } else {
    // Refreshing the session writes rotated auth cookies onto `response`.
    const supabase = createMiddlewareSupabase(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  const isAdminArea = pathname.startsWith('/admin');
  const isCustomerArea = pathname.startsWith('/dashboard');
  const loginPath = isAdminArea ? '/admin/login' : '/login';

  if ((isAdminArea || isCustomerArea) && !signedIn && pathname !== loginPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets — those need
     * neither a session refresh nor a tenant lookup.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
