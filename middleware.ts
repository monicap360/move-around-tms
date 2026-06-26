import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Carrier subdomains whose ROOT should show their portal, not the marketing landing page.
// e.g. ronyx.movearoundtms.app/ and ronyx.movearoundtms.com/ -> /ronyx
const CARRIERS = ["ronyx", "solis", "garcia", "ymr", "leah", "jjalvarado"];

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const sub  = host.split(".")[0];

  // Only the homepage ("/") of a carrier subdomain on the movearoundtms domain.
  if (
    req.nextUrl.pathname === "/" &&
    host.includes("movearoundtms") &&
    CARRIERS.includes(sub)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/${sub}`;
    return NextResponse.rewrite(url); // keep the clean URL, serve the portal
  }

  return NextResponse.next();
}

// Run ONLY on the root path — never touches /ronyx/*, /api/*, /_next/*, or assets.
export const config = {
  matcher: "/",
};
