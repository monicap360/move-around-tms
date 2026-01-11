
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";


// 🚀 Subscription enforcement middleware
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Security headers
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Only enforce for app routes, not static/assets/api
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith('/billing') || url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
    return res;
  }

  // Get Supabase session from cookies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const access_token = req.cookies.get('sb-access-token')?.value;
  if (!access_token) {
    url.pathname = '/billing/setup';
    return NextResponse.redirect(url);
  }
  const { data: { user } } = await supabase.auth.getUser(access_token);
  if (!user) {
    url.pathname = '/billing/setup';
    return NextResponse.redirect(url);
  }
  // Check for active payment
  const { data: payments } = await supabase.from('payments').select('status').eq('user_id', user.id).eq('status', 'active');
  if (!payments || payments.length === 0) {
    url.pathname = '/billing/setup';
    return NextResponse.redirect(url);
  }
  return res;
}

// Middleware applies to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|api).*)"
  ],
};
