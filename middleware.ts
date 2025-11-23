// middleware.ts
// Access middleware — expand later for session validation.


import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Tell Next.js which routes this applies to
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|auth|api).*)"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect unauthenticated users
  if (!session && !req.nextUrl.pathname.startsWith("/login")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}
