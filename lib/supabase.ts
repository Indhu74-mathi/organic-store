import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Server Client
 * 
 * Uses service role key for server-side operations.
 * This client bypasses Row Level Security (RLS) policies.
 * 
 * SECURITY: Never expose SUPABASE_SERVICE_ROLE_KEY to client-side code.
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (server-only)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

/**
 * Create Supabase client with service role key
 * This client has full access to the database (bypasses RLS)
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Type definitions for database tables
 */
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number // Stored in smallest currency unit (paise for INR)
  discountPercent: number | null
  imageUrl: string
  category: string
  isActive: boolean
  stock: number
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  passwordHash: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export interface Cart {
  id: string
  userId: string | null
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  userId: string
  status: string
  totalAmount: number
  shippingFee: number
  currency: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  razorpaySignature: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  unitPrice: number
  discountPercent: number | null
  finalPrice: number
  quantity: number
  createdAt: string
}
