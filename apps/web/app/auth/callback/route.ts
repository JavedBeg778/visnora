// Visnora — Supabase Auth Code Exchange Callback Route
// Handles OAuth, Email Confirmations, Magic Links, and Password Reset PKCE exchanges
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncUserProfile } from '@/domain/administration/user-service';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Automatically sync the user profile into database
        try {
          await syncUserProfile({
            id: data.user.id,
            email: data.user.email || '',
            fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
            avatarUrl: data.user.user_metadata?.avatar_url,
          });
        } catch (syncErr) {
          console.error('Failed to sync profile during auth callback:', syncErr);
        }

        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      }
    } catch (err) {
      console.error('Auth code exchange failed:', err);
    }
  }

  // Return the user to login page with clear error message
  return NextResponse.redirect(`${origin}/login?message=Authentication link expired or invalid.`);
}
