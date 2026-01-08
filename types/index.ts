/**
 * Central type definitions for the application
 * Add your shared types here
 */

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductVariant {
  id: string
  sizeGrams: number
  price: number // Price in rupees
  stock: number
  inStock: boolean
}

export interface Product {
  id: string
  slug?: string
  name: string
  description: string
  price: number // Original price in rupees (base price for non-malt, or variant price for malt)
  discountPercent?: number | null // Discount percentage (0-100)
  originalPrice?: number // Deprecated: use discountPercent instead
  category: string
  image: string
  images?: string[]
  inStock: boolean
  stock?: number // Current stock quantity
  rating?: number
  // Variants for malt products
  variants?: ProductVariant[]
  sizeGrams?: number | null // Size in grams (for cart items with selected variant)
}

export interface ValueCard {
  title: string
  description: string
  icon: string
}

