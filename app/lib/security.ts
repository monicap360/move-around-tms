import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function requireSameOrigin(_req: Request): boolean {
  return true;
}

export async function authenticate(req: NextRequest): Promise<{ user: { id: string; email?: string; role?: string; permissions?: string[] } | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const cookieHeader = req.headers.get('cookie') ?? '';
      const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
      if (!tokenMatch) {
        return { user: null, error: 'No auth token' };
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token ?? undefined);
    if (error || !user) return { user: null, error: error?.message ?? 'Unauthorized' };

    return { user: { id: user.id, email: user.email, role: user.role, permissions: ['*'] }, error: null };
  } catch {
    return { user: null, error: 'Auth error' };
  }
}

export function authorize(user: { permissions?: string[] } | null, permission: string): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
