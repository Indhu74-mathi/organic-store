/**
 * Authentication utilities
 *
 * Central export point for all authentication-related utilities.
 * This module provides password hashing/verification and JWT token management.
 *
 * Usage:
 * ```ts
 * import { hashPassword, verifyPassword, createAccessToken, verifyAccessToken } from '@/lib/auth'
 * ```
 */

export { hashPassword, verifyPassword } from './password'
export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  type TokenPayload,
  type TokenVerificationResult,
} from './tokens'

