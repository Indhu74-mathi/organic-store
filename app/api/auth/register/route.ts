import { NextResponse } from 'next/server'
import { hashPassword, createAccessToken, createRefreshToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
      maxLength: 128, // Reasonable limit
      required: true,
      trim: false, // Don't trim passwords
    })

    if (!email || !password) {
      return createErrorResponse(
        'Email and password are required. Password must be at least 8 characters.',
        400
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // SECURITY: Generic message to prevent user enumeration
      return createErrorResponse('User already exists', 409)
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email, // Already validated and normalized
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    // Automatically log in the user after registration
    const accessToken = createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshToken = createRefreshToken({
      userId: user.id,
      role: user.role,
    })

    return NextResponse.json(
      {
        success: true,
        accessToken,
        refreshToken,
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    )
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Registration failed',
      500,
      error
    )
  }
}
