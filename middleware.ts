import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Carrier subdomains whose ROOT should show their portal, not the marketing landing page.
const CARRIERS = ["ronyx", "solis", "garcia", "ymr", "leah", "jjalvarado"];

// ── PIN gate (server-enforced) ───────────────────────────────────────────────
// OFF unless RONYX_PIN_GATE=true, so deploying the code can never lock anyone out.
// When ON, every /ronyx page and /api/ronyx request needs a valid signed session
// cookie (set by /api/ronyx/staff-pins/verify on a correct PIN). Without it,
// pages redirect to /ronyx-lock and APIs return 401.
const GATE_ON = process.env.RONYX_PIN_GATE === "true";
const SECRET = process.env.PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "ronyx-dev-secret";
// MoveAround HQ (product company) gate — always on; its own login/cookie, separate from Ronyx.
const HQ_SECRET = process.env.HQ_SESSION_SECRET || process.env.PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "movearound-hq-dev-secret";

const enc = new TextEncoder();
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function validSession(token: string | undefined, secret: string = SECRET): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  try {
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sigB64) as BufferSource, enc.encode(payloadB64) as BufferSource);
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    return !(payload.exp && Date.now() > payload.exp);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const sub = host.split(".")[0];

  // 1) Carrier-subdomain root → portal (unchanged behavior).
  if (path === "/" && host.includes("movearoundtms") && CARRIERS.includes(sub)) {
    const u = url.clone();
    u.pathname = `/${sub}`;
    return NextResponse.rewrite(u);
  }

  // 2) PIN gate.
  if (GATE_ON) {
    const gated = path === "/ronyx" || path.startsWith("/ronyx/") || path.startsWith("/api/ronyx/");
    // Always reachable so staff can sign in / out and the lock screen can load.
    const allow =
      path === "/ronyx-lock" ||
      path === "/api/ronyx/staff-pins/verify" ||
      path === "/api/ronyx/staff-pins/logout" ||
      path === "/api/ronyx/logo" ||
      (path === "/api/ronyx/staff-pins" && req.method === "GET");

    if (gated && !allow) {
      const ok = await validSession(req.cookies.get("ronyx_session")?.value);
      if (!ok) {
        if (path.startsWith("/api/")) {
          return NextResponse.json({ error: "PIN required" }, { status: 401 });
        }
        const u = url.clone();
        u.pathname = "/ronyx-lock";
        u.search = "";
        u.searchParams.set("next", path + url.search);
        return NextResponse.redirect(u);
      }
    }
  }

  // 3) MoveAround HQ gate (always on) — product-company area, separate login.
  {
    const gated = path === "/hq" || path.startsWith("/hq/") || path.startsWith("/api/hq/");
    const allow = path === "/hq/login" || path === "/api/hq/verify" || path === "/api/hq/logout";
    if (gated && !allow) {
      const ok = await validSession(req.cookies.get("hq_session")?.value, HQ_SECRET);
      if (!ok) {
        if (path.startsWith("/api/")) return NextResponse.json({ error: "HQ login required" }, { status: 401 });
        const u = url.clone();
        u.pathname = "/hq/login";
        u.search = "";
        u.searchParams.set("next", path + url.search);
        return NextResponse.redirect(u);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/ronyx", "/ronyx/:path*", "/api/ronyx/:path*", "/ronyx-lock", "/hq", "/hq/:path*", "/api/hq/:path*"],
};
