import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
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

    // Sign in with Supabase Auth using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('[Login] Supabase auth error:', authError)
      
      if (authError.message.includes('Invalid API key') || authError.message.includes('URL and Key')) {
        console.error('[Login] Configuration error - check environment variables')
        return createErrorResponse('Server configuration error', 500)
      }
      
      recordLoginFailure(clientId)
      // SECURITY: Generic message prevents user enumeration
      return createErrorResponse('Invalid email or password', 401)
    }

    if (!authData.user) {
      recordLoginFailure(clientId)
      return createErrorResponse('Invalid email or password', 401)
    }

    // Fetch user role from User table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('User')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    // If user doesn't exist in User table, create it
    if (profileError && profileError.code === 'PGRST116') {
      // User not found in User table - create it
      const { error: createError } = await supabaseAdmin
        .from('User')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          role: 'USER',
        })

      if (createError) {
        console.error('[Login] Failed to create user profile:', createError)
      }
    }

    const role = userProfile?.role || 'USER'

    // SECURITY: Clear login failures on successful login
    clearLoginFailures(clientId)

    const responseTime = Date.now() - startTime
    console.log(`[Login] User ${email} logged in successfully (${responseTime}ms)`)

    // Return in format expected by frontend AuthContext
    // Use Supabase session tokens as accessToken/refreshToken for compatibility
    return NextResponse.json({
      success: true,
      accessToken: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token || '',
      userId: authData.user.id,
      email: authData.user.email || email,
      role,
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        role,
      },
    })
  } catch (error) {
    console.error('[Login] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    return createErrorResponse(errorMessage, 500, error)
  }
}
