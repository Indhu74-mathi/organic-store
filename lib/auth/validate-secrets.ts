/**
 * Validate JWT secrets at application boot
 * 
 * CRITICAL: This ensures the app fails fast if secrets are missing.
 * Never allow the app to start silently without proper secrets.
 * 
 * Call this at the top level of your app or in a startup check.
 */

export function validateJWTSecrets(): void {
  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET

  if (!accessSecret || accessSecret.trim().length === 0) {
    throw new Error(
      'CRITICAL: JWT_ACCESS_SECRET environment variable is required but not set. ' +
      'The application cannot start without this secret.'
    )
  }

  if (!refreshSecret || refreshSecret.trim().length === 0) {
    throw new Error(
      'CRITICAL: JWT_REFRESH_SECRET environment variable is required but not set. ' +
      'The application cannot start without this secret.'
    )
  }

  // Warn if secrets are too short (minimum 32 characters recommended)
  if (accessSecret.length < 32) {
    console.warn(
      'WARNING: JWT_ACCESS_SECRET is shorter than 32 characters. ' +
      'Consider using a longer, more secure secret.'
    )
  }

  if (refreshSecret.length < 32) {
    console.warn(
      'WARNING: JWT_REFRESH_SECRET is shorter than 32 characters. ' +
      'Consider using a longer, more secure secret.'
    )
  }
}

