/**
 * Boot-time security checks
 * 
 * CRITICAL: Call this at application startup to ensure
 * the app fails fast if critical security configuration is missing.
 * 
 * Usage:
 * ```ts
 * import { validateBootSecurity } from '@/lib/auth/boot-check'
 * validateBootSecurity()
 * ```
 */

import { validateJWTSecrets } from './validate-secrets'

/**
 * Validate all critical security configuration at boot
 * 
 * Throws error if any required configuration is missing.
 * This ensures the app never starts silently with insecure configuration.
 * 
 * NOTE: Razorpay keys are validated at module load in lib/payments/razorpay.ts
 * This ensures fail-fast behavior when payment routes are accessed.
 */
export function validateBootSecurity(): void {
  try {
    // Validate JWT secrets are set
    validateJWTSecrets()
    
    // NOTE: Razorpay keys are validated when lib/payments/razorpay.ts is imported
    // This happens when payment routes are accessed, ensuring fail-fast behavior
    
    console.log('✓ Security configuration validated')
  } catch (error) {
    console.error('✗ CRITICAL SECURITY ERROR:', error)
    throw error
  }
}

