import jwt from 'jsonwebtoken'

/**
 * JWT token utilities for authentication
 *
 * Uses jsonwebtoken library with separate secrets for access and refresh tokens.
 * Secrets are read from environment variables - NEVER hardcode them.
 *
 * Environment variables required:
 * - JWT_ACCESS_SECRET: Secret for signing/verifying access tokens (REQUIRED)
 * - JWT_REFRESH_SECRET: Secret for signing/verifying refresh tokens (REQUIRED)
 * - JWT_ACCESS_EXPIRES_IN: Access token expiration (default: '15m')
 * - JWT_REFRESH_EXPIRES_IN: Refresh token expiration (default: '7d')
 *
 * SECURITY: Access tokens are short-lived (10-15 min), refresh tokens are long-lived (7-30 days).
 * Always verify token expiry in addition to signature.
 */

// Read secrets from environment variables
// CRITICAL: These must be set or app will fail at boot (validated in validateJWTSecrets)
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

// Token expiration defaults (can be overridden via env vars)
// SECURITY: Short-lived access tokens (15 min) reduce exposure window
// Long-lived refresh tokens (7 days) balance UX and security
const ACCESS_TOKEN_EXPIRES_IN: string = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * Token payload interface
 * Extend this to include additional user claims as needed
 */
export interface TokenPayload {
  userId: string
  email?: string
  role?: string
  [key: string]: unknown
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean
  payload?: TokenPayload
  error?: string
}


/**
 * Create a JWT access token
 *
 * Access tokens are short-lived (default: 15 minutes) and used for API requests.
 * They should be stored in memory (not localStorage) to reduce XSS risk.
 *
 * @param payload - The token payload (typically userId and user metadata)
 * @returns The signed JWT access token
 * @throws Error if secret is not configured or token creation fails
 *
 * Example:
 * ```ts
 * const token = createAccessToken({ userId: '123', email: 'user@example.com' })
 * ```
 */
export function createAccessToken(payload: TokenPayload): string {
  if (!payload.userId) {
    throw new Error('Token payload must include userId')
  }

  if (!ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not configured')
  }

  try {
    // Type assertion needed due to jsonwebtoken type definitions
    return jwt.sign(
      payload,
      ACCESS_SECRET as string,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'millet-n-joy',
        audience: 'millet-n-joy-api',
      } as jwt.SignOptions
    )
  } catch (error) {
    throw new Error('Failed to create access token', { cause: error })
  }
}

/**
 * Create a JWT refresh token
 *
 * Refresh tokens are long-lived (default: 7 days) and used to obtain new access tokens.
 * They should be stored securely (httpOnly cookies preferred) and rotated on use.
 *
 * @param payload - The token payload (typically userId)
 * @returns The signed JWT refresh token
 * @throws Error if secret is not configured or token creation fails
 *
 * Example:
 * ```ts
 * const refreshToken = createRefreshToken({ userId: '123' })
 * ```
 */
export function createRefreshToken(payload: TokenPayload): string {
  if (!payload.userId) {
    throw new Error('Token payload must include userId')
  }

  if (!REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured')
  }

  try {
    // Type assertion needed due to jsonwebtoken type definitions
    return jwt.sign(
      payload,
      REFRESH_SECRET as string,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'millet-n-joy',
        audience: 'millet-n-joy-api',
      } as jwt.SignOptions
    )
  } catch (error) {
    throw new Error('Failed to create refresh token', { cause: error })
  }
}

/**
 * Verify and decode an access token
 *
 * @param token - The JWT access token to verify
 * @returns Verification result with payload if valid, error if invalid
 *
 * Example:
 * ```ts
 * const result = verifyAccessToken(token)
 * if (result.valid && result.payload) {
 *   const userId = result.payload.userId
 * }
 * ```
 */
export function verifyAccessToken(
  token: string
): TokenVerificationResult {
  if (!token) {
    return { valid: false, error: 'Token is required' }
  }

  if (!ACCESS_SECRET) {
    return { valid: false, error: 'JWT_ACCESS_SECRET is not configured' }
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET as string, {
      issuer: 'millet-n-joy',
      audience: 'millet-n-joy-api',
    }) as TokenPayload

    return { valid: true, payload }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token has expired' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' }
    }
    return { valid: false, error: 'Token verification failed' }
  }
}

/**
 * Verify and decode a refresh token
 *
 * @param token - The JWT refresh token to verify
 * @returns Verification result with payload if valid, error if invalid
 *
 * Example:
 * ```ts
 * const result = verifyRefreshToken(refreshToken)
 * if (result.valid && result.payload) {
 *   // Issue new access token
 *   const newAccessToken = createAccessToken({ userId: result.payload.userId })
 * }
 * ```
 */
export function verifyRefreshToken(
  token: string
): TokenVerificationResult {
  if (!token) {
    return { valid: false, error: 'Token is required' }
  }

  if (!REFRESH_SECRET) {
    return { valid: false, error: 'JWT_REFRESH_SECRET is not configured' }
  }

  try {
    const payload = jwt.verify(token, REFRESH_SECRET as string, {
      issuer: 'millet-n-joy',
      audience: 'millet-n-joy-api',
    }) as TokenPayload

    return { valid: true, payload }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Refresh token has expired' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid refresh token' }
    }
    return { valid: false, error: 'Refresh token verification failed' }
  }
}

/**
 * Decode a token without verification (for debugging/inspection only)
 * DO NOT use this for authentication - always use verify functions
 *
 * @param token - The JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null
    return decoded
  } catch {
    return null
  }
}

