/**
 * Categories that use size variants (ProductVariant table)
 */
const VARIANT_CATEGORIES = ['Malt', 'Saadha Podi', 'saadha podi'] as const

/**
 * Check if a product category uses size variants
 * Case-insensitive comparison to handle variations in capitalization
 */
export function hasVariants(category: string): boolean {
  if (!category) return false
  const normalizedCategory = category.trim()
  return VARIANT_CATEGORIES.some(vc => vc.toLowerCase() === normalizedCategory.toLowerCase())
}
