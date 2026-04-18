/**
 * In-memory rate limiter for Supabase Edge Functions.
 * Limits requests per IP per time window.
 *
 * Usage:
 *   import { checkRateLimit } from '../_shared/rateLimit.ts';
 *
 *   const limited = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
 *   if (limited) return limited; // returns 429 Response
 */

// Simple in-memory store — resets when the edge function instance is recycled
const store = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Returns a 429 Response if the caller exceeds the rate limit, otherwise null.
 * Key is derived from the caller's IP address.
 */
export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = { maxRequests: 20, windowMs: 60_000 }
): Response | null {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  entry.count += 1;

  if (entry.count > options.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  return null;
}
