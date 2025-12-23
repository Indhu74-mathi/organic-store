/**
 * Central type definitions for the application
 * Add your shared types here
 */

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  slug?: string
  name: string
  description: string
  price: number // Original price in rupees
  discountPercent?: number | null // Discount percentage (0-100)
  originalPrice?: number // Deprecated: use discountPercent instead
  category: string
  image: string
  inStock: boolean
  stock?: number // Current stock quantity
  rating?: number
}

export interface ValueCard {
  title: string
  description: string
  icon: string
}

