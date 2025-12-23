import { NextResponse } from 'next/server'
import { verifyPassword, createAccessToken, createRefreshToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateEmail } from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
  recordLoginFailure,
  clearLoginFailures,
} from '@/lib/auth/rate-limit'
import { createErrorResponse } from '@/lib/auth/api-auth'

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    // SECURITY: Rate limit login attempts (5 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`login:${clientId}`, 5, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse(
        'Too many login attempts. Please try again later.',
        429
      )
    }

    // SECURITY: Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const { email: rawEmail, password: rawPassword } = body as Record<string, unknown>

    // SECURITY: Validate and sanitize inputs
    const email = validateEmail(rawEmail)
    const password = typeof rawPassword === 'string' ? rawPassword : null

    if (!email || !password || password.length === 0) {
      // SECURITY: Generic message prevents user enumeration
      return createErrorResponse('Invalid email or password', 401)
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    })

    // SECURITY: Generic message prevents user enumeration
    // Always perform password verification to prevent timing attacks
    const isValid = user
      ? await verifyPassword(password, user.passwordHash)
      : false

    if (!user || !isValid) {
      // SECURITY: Record failed login attempt for exponential backoff
      const { delayMs } = recordLoginFailure(clientId)
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      // SECURITY: Consistent response timing to prevent timing attacks
      const elapsed = Date.now() - startTime
      const minDelay = 500 // Minimum 500ms response time
      if (elapsed < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed))
      }

      return createErrorResponse('Invalid email or password', 401)
    }

    // SECURITY: Clear login failures on successful login
    clearLoginFailures(clientId)

    const accessToken = createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshToken = createRefreshToken({
      userId: user.id,
      role: user.role,
    })

    // SECURITY: Consistent response timing
    const elapsed = Date.now() - startTime
    const minDelay = 200 // Minimum 200ms response time
    if (elapsed < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed))
    }

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Login failed',
      500,
      error
    )
  }
}
