/**
 * In-memory rate limiting
 * 
 * Lightweight rate limiting without Redis.
 * For production at scale, consider Redis-based solution.
 * 
 * Tracks requests per IP/identifier with sliding window.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (clears on server restart)
// In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Check if request should be rate limited
 * 
 * @param identifier - Unique identifier (IP, userId, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(identifier, newEntry)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetAt,
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from headers (set by proxy/load balancer)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return ip
}

/**
 * Exponential backoff for failed login attempts
 */
const loginFailureStore = new Map<string, { count: number; resetAt: number }>()

export function recordLoginFailure(identifier: string): { delayMs: number } {
  const now = Date.now()
  const entry = loginFailureStore.get(identifier)

  if (!entry || entry.resetAt < now) {
    loginFailureStore.set(identifier, {
      count: 1,
      resetAt: now + 15 * 60 * 1000, // 15 minute window
    })
    return { delayMs: 0 }
  }

  entry.count++
  loginFailureStore.set(identifier, entry)

  // Exponential delay: 1s, 2s, 4s, 8s, max 30s
  const delayMs = Math.min(1000 * Math.pow(2, entry.count - 1), 30000)

  return { delayMs }
}

export function clearLoginFailures(identifier: string): void {
  loginFailureStore.delete(identifier)
}

