import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateEmail, validateString } from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/auth/rate-limit'
import { createErrorResponse } from '@/lib/auth/api-auth'

export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit registration (3 per hour per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`register:${clientId}`, 3, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse(
        'Too many registration attempts. Please try again later.',
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
    const password = validateString(rawPassword, {
      minLength: 8,
      maxLength: 128,
      required: true,
      trim: false,
    })

    if (!email || !password) {
      return createErrorResponse(
        'Email and password are required. Password must be at least 8 characters.',
        400
      )
    }

    // Sign up with Supabase Auth using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error('[Register] Supabase auth error:', authError)
      
      // Handle specific Supabase errors
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already exists') ||
        authError.message.includes('User already registered')
      ) {
        return createErrorResponse('User already exists', 409)
      }
      
      if (authError.message.includes('Invalid API key') || authError.message.includes('URL and Key')) {
        console.error('[Register] Configuration error - check environment variables')
        return createErrorResponse('Server configuration error', 500)
      }
      
      return createErrorResponse(
        authError.message || 'Registration failed',
        400
      )
    }

    if (!authData.user) {
      return createErrorResponse('Registration failed: No user returned', 500)
    }

    // Create user profile in User table
    const { error: profileError } = await supabaseAdmin
      .from('User')
      .insert({
        id: authData.user.id,
        email: authData.user.email || email,
        role: 'USER',
      })

    if (profileError) {
      console.error('[Register] Failed to create user profile:', profileError)
      // User was created in auth but not in User table
      // This is not ideal but we'll continue
    }

    // Return in format expected by frontend AuthContext
    // Use Supabase session tokens as accessToken/refreshToken for compatibility
    return NextResponse.json(
      {
        success: true,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || '',
        userId: authData.user.id,
        email: authData.user.email || email,
        role: 'USER',
        user: {
          id: authData.user.id,
          email: authData.user.email || email,
          role: 'USER',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Register] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Registration failed'
    return createErrorResponse(errorMessage, 500, error)
  }
}
