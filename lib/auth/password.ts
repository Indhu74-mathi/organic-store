import bcrypt from 'bcrypt'

/**
 * Password hashing and verification utilities
 *
 * Uses bcrypt with a configurable salt rounds (default: 12).
 * Higher rounds = more secure but slower. 12 rounds is a good balance
 * for most applications (takes ~300ms per hash on modern hardware).
 */

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)

/**
 * Hash a plain text password
 *
 * @param plainPassword - The plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if hashing fails
 *
 * Example:
 * ```ts
 * const hash = await hashPassword('userPassword123')
 * // Store hash in database
 * ```
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length === 0) {
    throw new Error('Password cannot be empty')
  }

  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS)
    return hash
  } catch (error) {
    throw new Error('Failed to hash password', { cause: error })
  }
}

/**
 * Verify a plain text password against a hash
 *
 * @param plainPassword - The plain text password to verify
 * @param hash - The stored password hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * Example:
 * ```ts
 * const isValid = await verifyPassword('userPassword123', storedHash)
 * if (isValid) {
 *   // User authenticated
 * }
 * ```
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  if (!plainPassword || !hash) {
    return false
  }

  try {
    const isValid = await bcrypt.compare(plainPassword, hash)
    return isValid
  } catch (error) {
    // Log error in production but don't expose details
    console.error('Password verification error:', error)
    return false
  }
}

