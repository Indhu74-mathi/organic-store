import type { CartItem } from '@/components/cart/CartContext'

/**
 * Cart Storage Utilities
 *
 * CRITICAL: Cart storage is completely independent from authentication storage.
 *
 * Cart Continuity:
 * - Cart data persists across login/logout
 * - CartId remains stable across auth changes
 * - Cart storage keys are separate from auth storage keys
 * - This ensures zero cart disruption during auth flows
 *
 * Cart-User Merging:
 * When a user logs in, the server can associate the cartId with the userId.
 * This happens server-side via API call (POST /api/cart/merge) and does not
 * affect client-side cart storage or state.
 *
 * Storage Keys:
 * - CART_KEY: 'millet-n-joy/cart' - stores cart snapshot with items
 * - CART_ID_KEY: 'millet-n-joy/cart-id' - stores stable cart identifier
 * - Auth keys are separate: 'millet-n-joy/auth-token', 'millet-n-joy/user-id', etc.
 */

const CART_KEY = 'millet-n-joy/cart'
const CART_ID_KEY = 'millet-n-joy/cart-id'

export interface StoredCartItem {
  productId: string
  quantity: number
}

export interface StoredCartSnapshot {
  cartId: string
  items: StoredCartItem[]
}

function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * Get or create a stable cart ID
 *
 * CRITICAL: This cartId persists across login/logout.
 * - If a cartId exists in localStorage, it is returned (preserved)
 * - If no cartId exists, a new one is generated and stored
 * - This ID remains stable even when auth state changes
 * - Server can associate this cartId with userId during cart-user merge
 *
 * @returns A stable cart identifier that persists across auth changes
 */
export function getOrCreateCartId(): string {
  if (!isBrowser()) return ''

  try {
    const existing = window.localStorage.getItem(CART_ID_KEY)
    if (existing && typeof existing === 'string') {
      // Return existing cartId - this persists across login/logout
      return existing
    }
  } catch {
    // Ignore and generate a new ID.
  }

  const newId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `cart_${Math.random().toString(36).slice(2)}`

  try {
    window.localStorage.setItem(CART_ID_KEY, newId)
  } catch {
    // Storage might be unavailable; cart will still work in memory.
  }

  return newId
}

export function loadCartSnapshot(): StoredCartSnapshot | null {
  if (!isBrowser()) return null

  try {
    const raw = window.localStorage.getItem(CART_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<StoredCartSnapshot>

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.cartId !== 'string' ||
      !Array.isArray(parsed.items)
    ) {
      return null
    }

    const items: StoredCartItem[] = parsed.items
      .filter(
        (item): item is StoredCartItem =>
          !!item &&
          typeof item.productId === 'string' &&
          typeof item.quantity === 'number' &&
          item.quantity > 0
      )

    return {
      cartId: parsed.cartId,
      items,
    }
  } catch {
    // Corrupted or invalid data; ignore and start fresh.
    return null
  }
}

export function saveCartSnapshot(snapshot: StoredCartSnapshot): void {
  if (!isBrowser()) return

  try {
    const payload: StoredCartSnapshot = {
      cartId: snapshot.cartId,
      items: snapshot.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }

    window.localStorage.setItem(CART_KEY, JSON.stringify(payload))
  } catch {
    // Ignore write errors to avoid breaking UX.
  }
}

export function serializeCartItems(items: CartItem[]): StoredCartItem[] {
  return items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
  }))
}

/**
 * Clear guest cart from localStorage
 * Used after merging guest cart into user cart
 */
export function clearCartSnapshot(): void {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(CART_KEY)
    window.localStorage.removeItem(CART_ID_KEY)
  } catch {
    // Ignore errors
  }
}


