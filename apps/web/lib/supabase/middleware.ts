// Visnora — Supabase Session Refresh, Route Protection & Security Headers Middleware
// Reference: docs/SECURITY.md & Phase 1 Audit Findings 8, 10

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Apply hardened security headers (CSP, HSTS, X-Frame-Options, etc.) to all outgoing responses.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none';"
  );
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email');

  // Complete list of all protected tenant pages across M0-M6
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/brands') ||
    pathname.startsWith('/citations') ||
    pathname.startsWith('/competitors') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/prompts') ||
    pathname.startsWith('/recommendations') ||
    pathname.startsWith('/runs') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/workspaces') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/ads') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/chatgpt-ads');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  const isMockOrMissing =
    !supabaseUrl ||
    supabaseUrl.includes('mock.supabase.co') ||
    !supabaseAnonKey ||
    supabaseAnonKey === 'mock-anon-key';

  // Audit Finding 8: In production, fail-closed if Supabase authentication is not configured!
  if (isMockOrMissing) {
    if (process.env.NODE_ENV === 'production' && isProtectedPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'auth_unavailable');
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    // Allow pass-through in development/testing environments only
    return applySecurityHeaders(supabaseResponse);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Calling getUser() refreshes expired tokens and securely validates the user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is unauthenticated and attempting to access protected route -> redirect to /login
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // If user is authenticated and visiting auth pages -> redirect to /dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(supabaseResponse);
}
