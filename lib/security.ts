// lib/security.ts
// Basic sanitization and token utility functions.

export function sanitize(input: string): string {
  return input.replace(/[<>]/g, "");
}

export function hasValidToken(token?: string) {
  return typeof token === "string" && token.length > 20;
}
// lib/security.ts
// Basic input sanitizer & token utilities.

export function sanitize(input: string): string {
  return input.replace(/[<>]/g, "");
}

export function hasValidToken(token?: string) {
  return typeof token === "string" && token.length > 20;
}
<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from './supabaseAdmin';
import { verifyJWT } from './jwt';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  admin: { requests: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
  upload: { requests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes (login attempts)
};

// Role-based permissions
const PERMISSIONS = {
  admin: ['*'], // Full access
  manager: [
    'read:drivers', 'read:vehicles', 'read:maintenance', 'read:compliance',
    'write:maintenance', 'write:compliance', 'read:reports', 'read:analytics'
  ],
  dispatcher: [
    'read:drivers', 'read:vehicles', 'write:assignments', 'read:loads',
    'write:loads', 'read:routes'
  ],
  driver: [
    'read:profile', 'write:profile', 'read:assignments', 'write:dvir',
    'read:payroll', 'write:timecard', 'read:documents'
  ],
  hr: [
    'read:drivers', 'write:drivers', 'read:compliance', 'write:compliance',
    'read:payroll', 'write:payroll', 'read:hr-reports'
  ],
  accounting: [
    'read:invoices', 'write:invoices', 'read:payroll', 'write:payroll',
    'read:financial-reports', 'read:factoring'
  ],
  viewer: [
    'read:dashboard', 'read:reports'
  ]
};

export interface AuthUser {
  id: string;
  email: string;
  role: keyof typeof PERMISSIONS;
  name?: string;
  permissions: string[];
}

// Rate limiting middleware
export function checkRateLimit(
  req: NextRequest, 
  category: keyof typeof RATE_LIMITS = 'default'
): { allowed: boolean; remaining: number; resetTime: number } {
  const ip = (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown';
  const key = `${ip}:${category}`;
  const limit = RATE_LIMITS[category];
  const now = Date.now();

  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.windowMs });
    return { allowed: true, remaining: limit.requests - 1, resetTime: now + limit.windowMs };
  }
  
  if (current.count >= limit.requests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  rateLimitMap.set(key, current);
  
  return { allowed: true, remaining: limit.requests - current.count, resetTime: current.resetTime };
}

// Authentication middleware
export async function authenticate(req: NextRequest): Promise<{ user: AuthUser | null; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);
  
  // Check if it's the legacy admin token (for backward compatibility)
  if (token === process.env.ADMIN_TOKEN) {
    return {
      user: {
        id: 'admin',
        email: 'admin@ronyxlogistics.com',
        role: 'admin',
        name: 'System Administrator',
        permissions: PERMISSIONS.admin
      }
    };
  }

  // Verify JWT token
  try {
    const payload = await verifyJWT(token);
    
    if (!payload || !payload.sub || !payload.role) {
      return { user: null, error: 'Invalid token payload' };
    }

    // Get user details from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, name, active')
      .eq('id', payload.sub)
      .single();

    if (error || !user || !user.active) {
      return { user: null, error: 'User not found or inactive' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        permissions: PERMISSIONS[user.role as keyof typeof PERMISSIONS] || []
      }
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { user: null, error: 'Invalid or expired token' };
  }
}

// Authorization middleware
export function authorize(user: AuthUser | null, requiredPermission: string): boolean {
  if (!user) return false;
  
  // Admin has full access
  if (user.permissions.includes('*')) return true;
  
  // Check specific permission
  if (user.permissions.includes(requiredPermission)) return true;
  
  // Check wildcard permissions (e.g., 'read:*' matches 'read:drivers')
  const [action, resource] = requiredPermission.split(':');
  const wildcardPermission = `${action}:*`;
  if (user.permissions.includes(wildcardPermission)) return true;
  
  return false;
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://*.supabase.co;"
  );
  
  return response;
}

// Audit logging
export async function logActivity(
  user: AuthUser | null,
  action: string,
  resource: string,
  details?: any,
  ip?: string
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user?.id || 'anonymous',
      user_email: user?.email,
      action,
      resource,
      details: details ? JSON.stringify(details) : null,
      ip_address: ip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// API wrapper with security features
export function withSecurity(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  options: {
    permission?: string;
    rateLimit?: keyof typeof RATE_LIMITS;
    auditAction?: string;
    auditResource?: string;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Rate limiting
      const rateLimitCategory = options.rateLimit || 'default';
      const rateLimit = checkRateLimit(req, rateLimitCategory);
      
      if (!rateLimit.allowed) {
        const response = NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: rateLimit.resetTime },
          { status: 429 }
        );
        response.headers.set('X-RateLimit-Limit', RATE_LIMITS[rateLimitCategory].requests.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
        return addSecurityHeaders(response);
      }

      // Authentication
      const { user, error } = await authenticate(req);
      
      if (error || !user) {
        const response = NextResponse.json(
          { error: error || 'Unauthorized' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }

      // Authorization
      if (options.permission && !authorize(user, options.permission)) {
        const response = NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }

      // Audit logging
      if (options.auditAction && options.auditResource) {
        const ip = (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown';
        await logActivity(user, options.auditAction, options.auditResource, {}, ip);
      }

      // Execute handler
      const response = await handler(req, user);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', RATE_LIMITS[rateLimitCategory].requests.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      return addSecurityHeaders(response);
      
    } catch (error) {
      console.error('Security middleware error:', error);
      const response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
  };
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  
  if (!origin || !host) {
    throw new Error('Missing origin or host headers')
  }
  
  const originHost = new URL(origin).host
  if (originHost !== host) {
    throw new Error('Cross-origin request not allowed')
  }
  
  return true
}
=======
import type { NextRequest } from 'next/server'

export function isSameOrigin(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || ''
    const referer = req.headers.get('referer') || ''
    const requestOrigin = new URL(req.url).origin
    const allowed = process.env.NEXT_PUBLIC_BASE_URL || ''

    // Prefer Origin header; fallback to Referer
    const headerOrigin = origin || (referer ? new URL(referer).origin : '')

    if (!headerOrigin) return false

    // Allow if matches current request origin
    if (headerOrigin === requestOrigin) return true

    // Allow if matches explicitly configured base URL
    if (allowed && headerOrigin === allowed) return true

    return false
  } catch {
    return false
  }
}

export function requireSameOrigin(req: NextRequest) {
  return isSameOrigin(req)
}
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
