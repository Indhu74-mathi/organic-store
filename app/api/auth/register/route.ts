import { NextResponse } from 'next/server'
import { hashPassword, createAccessToken, createRefreshToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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

    // Check if user exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (checkError) {
      console.error('[Register] Supabase check error:', checkError)
      return createErrorResponse('Registration failed', 500)
    }

    if (existingUsers && existingUsers.length > 0) {
      return createErrorResponse('User already exists', 409)
    }

    const passwordHash = await hashPassword(password)

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('User')
      .insert({
        email,
        passwordHash,
        role: 'USER',
      })
      .select('id, email, role')
      .single()

    if (createError || !newUser) {
      console.error('[Register] Supabase create error:', createError)
      return createErrorResponse('Registration failed', 500)
    }

    // Automatically log in the user after registration
    const accessToken = createAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })
    const refreshToken = createRefreshToken({
      userId: newUser.id,
      role: newUser.role,
    })

    return NextResponse.json(
      {
        success: true,
        accessToken,
        refreshToken,
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Register] Error:', error)
    return createErrorResponse('Registration failed', 500, error)
  }
}
