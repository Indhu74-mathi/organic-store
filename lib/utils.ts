/**
 * Utility functions for the application
 * Add your shared utility functions here
 */

/**
 * Formats a date to a readable string
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Formats a date string (from database) to IST (Indian Standard Time)
 * Database timestamps are in UTC, this converts them to IST (UTC+5:30)
 * @param dateString - ISO date string from database (UTC)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in IST
 */
export function formatDateIST(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }
): string {
  if (!dateString) return 'N/A'
  
  // Parse the date string as UTC
  const date = new Date(dateString)
  
  // Format in IST timezone (Asia/Kolkata = UTC+5:30)
  return new Intl.DateTimeFormat('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

/**
 * Formats a date string to a short date format in IST
 * @param dateString - ISO date string from database (UTC)
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDateShortIST(dateString: string | null | undefined): string {
  return formatDateIST(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Delays execution by the specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

