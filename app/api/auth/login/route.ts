import { NextResponse } from 'next/server'
import { verifyPassword, createAccessToken, createRefreshToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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

    // Fetch user from Supabase
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (userError) {
      console.error('[Login] Supabase error:', userError)
      recordLoginFailure(clientId)
      return createErrorResponse('Invalid email or password', 401)
    }

    if (!users || users.length === 0) {
      recordLoginFailure(clientId)
      // SECURITY: Generic message prevents user enumeration
      return createErrorResponse('Invalid email or password', 401)
    }

    const user = users[0]

    // SECURITY: Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      recordLoginFailure(clientId)
      // SECURITY: Generic message prevents user enumeration
      return createErrorResponse('Invalid email or password', 401)
    }

    // SECURITY: Clear login failures on successful login
    clearLoginFailures(clientId)

    // SECURITY: Generate tokens
    const accessToken = createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    const refreshToken = createRefreshToken({
      userId: user.id,
      role: user.role,
    })

    const responseTime = Date.now() - startTime
    console.log(`[Login] User ${user.email} logged in successfully (${responseTime}ms)`)

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[Login] Error:', error)
    return createErrorResponse('Login failed', 500, error)
  }
}
