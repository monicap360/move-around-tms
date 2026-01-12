import { NextRequest, NextResponse } from "next/server";

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  admin: { requests: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
  upload: { requests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
};

// Enhanced authentication check
export function enhancedAuth(req: NextRequest): {
  authorized: boolean;
  reason?: string;
} {
  const authHeader = req.headers.get("authorization");
  const adminToken = process.env.ADMIN_TOKEN;

  if (!authHeader) {
    return { authorized: false, reason: "Missing authorization header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, reason: "Invalid authorization format" };
  }

  const token = authHeader.substring(7);

  if (!adminToken) {
    return { authorized: false, reason: "Server configuration error" };
  }

  if (token !== adminToken) {
    return { authorized: false, reason: "Invalid token" };
  }

  return { authorized: true };
}

// Rate limiting middleware
export function checkRateLimit(
  req: NextRequest,
  category: keyof typeof RATE_LIMITS = "default",
): { allowed: boolean; remaining: number; resetTime: number } {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";
  const key = `${ip}:${category}`;
  const limit = RATE_LIMITS[category];
  const now = Date.now();

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.windowMs });
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetTime: now + limit.windowMs,
    };
  }

  if (current.count >= limit.requests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  rateLimitMap.set(key, current);

  return {
    allowed: true,
    remaining: limit.requests - current.count,
    resetTime: current.resetTime,
  };
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://*.supabase.co;",
  );

  return response;
}

// Input validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// API wrapper with enhanced security
export function withEnhancedSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: keyof typeof RATE_LIMITS;
    requireAuth?: boolean;
  } = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Rate limiting
      const rateLimitCategory = options.rateLimit || "default";
      const rateLimit = checkRateLimit(req, rateLimitCategory);

      if (!rateLimit.allowed) {
        const response = NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          },
          { status: 429 },
        );
        response.headers.set(
          "X-RateLimit-Limit",
          RATE_LIMITS[rateLimitCategory].requests.toString(),
        );
        response.headers.set("X-RateLimit-Remaining", "0");
        response.headers.set(
          "X-RateLimit-Reset",
          rateLimit.resetTime.toString(),
        );
        response.headers.set(
          "Retry-After",
          Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        );
        return addSecurityHeaders(response);
      }

      // Authentication (if required)
      if (options.requireAuth !== false) {
        // Default to true
        const authResult = enhancedAuth(req);

        if (!authResult.authorized) {
          const response = NextResponse.json(
            { error: "Unauthorized", reason: authResult.reason },
            { status: 401 },
          );
          return addSecurityHeaders(response);
        }
      }

      // Execute handler
      const response = await handler(req);

      // Add rate limit headers
      response.headers.set(
        "X-RateLimit-Limit",
        RATE_LIMITS[rateLimitCategory].requests.toString(),
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimit.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", rateLimit.resetTime.toString());

      return addSecurityHeaders(response);
    } catch (error) {
      console.error("Security middleware error:", error);
      const response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
      return addSecurityHeaders(response);
    }
  };
}

// CORS helper
export function corsHeaders(origin?: string) {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://ronyx-logistics.vercel.app",
    // Add your production domain here
  ];

  const corsOrigin =
    origin && allowedOrigins.includes(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

// Helper for same-origin requests
export function requireSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// Clean up rate limit storage periodically
setInterval(
  () => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    rateLimitMap.forEach((value, key) => {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => rateLimitMap.delete(key));
  },
  5 * 60 * 1000,
); // Clean up every 5 minutes
