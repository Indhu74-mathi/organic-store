/**
 * Input validation and sanitization utilities
 * 
 * Protects against:
 * - Mass assignment attacks
 * - SQL injection (Prisma helps, but we validate anyway)
 * - XSS via input length limits
 * - Malformed data
 */

/**
 * Validate and sanitize string input
 */
export function validateString(
  value: unknown,
  options: {
    minLength?: number
    maxLength?: number
    required?: boolean
    trim?: boolean
  } = {}
): string | null {
  const { minLength = 0, maxLength = 10000, required = false, trim = true } = options

  if (value === null || value === undefined) {
    return required ? null : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const sanitized = trim ? value.trim() : value

  if (sanitized.length < minLength) {
    return null
  }

  if (sanitized.length > maxLength) {
    return null
  }

  return sanitized
}

/**
 * Validate email format
 */
export function validateEmail(email: unknown): string | null {
  const sanitized = validateString(email, { maxLength: 255, required: true, trim: true })
  if (!sanitized) return null

  // Basic email validation (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return null
  }

  return sanitized.toLowerCase()
}

/**
 * Validate array with size limits
 */
export function validateArray<T>(
  value: unknown,
  options: {
    maxLength?: number
    required?: boolean
    itemValidator?: (item: unknown) => item is T
  } = {}
): T[] | null {
  const { maxLength = 1000, required = false, itemValidator } = options

  if (value === null || value === undefined) {
    return required ? null : []
  }

  if (!Array.isArray(value)) {
    return null
  }

  if (value.length > maxLength) {
    return null
  }

  if (itemValidator) {
    const validItems = value.filter(itemValidator)
    if (validItems.length !== value.length) {
      return null // Some items failed validation
    }
    return validItems
  }

  return value as T[]
}

/**
 * Validate number with range
 */
export function validateNumber(
  value: unknown,
  options: {
    min?: number
    max?: number
    required?: boolean
    integer?: boolean
  } = {}
): number | null {
  const { min, max, required = false, integer = false } = options

  if (value === null || value === undefined) {
    return required ? null : null
  }

  const num = typeof value === 'number' ? value : Number(value)

  if (isNaN(num)) {
    return null
  }

  if (integer && !Number.isInteger(num)) {
    return null
  }

  if (min !== undefined && num < min) {
    return null
  }

  if (max !== undefined && num > max) {
    return null
  }

  return num
}

/**
 * Validate cart item ID format
 * Type predicate version for use with validateArray
 */
export function validateCartItemId(value: unknown): value is string {
  const sanitized = validateString(value, { minLength: 1, maxLength: 100, required: true })
  if (!sanitized) return false

  // Cart item IDs should be alphanumeric with hyphens/underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return false
  }

  return true
}

