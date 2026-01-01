'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
} from 'react'
import type { Product } from '@/types'
import CartDrawer from '@/components/cart/CartDrawer'
import {
  getOrCreateCartId,
  saveCartSnapshot,
  serializeCartItems,
} from '@/lib/cartStorage'
import { hasVariants } from '@/lib/products'
import { useAuth } from '@/components/auth/AuthContext'
import { calculateDiscountedPrice } from '@/lib/pricing'

export interface CartItem {
  cartItemId?: string // ID from database (only for authenticated users)
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string; cartItemId?: string; sizeGrams?: number | null }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number; cartItemId?: string; sizeGrams?: number | null }
  | { type: 'CLEAR' }
  | { type: 'REPLACE_ALL'; items: CartItem[] }

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variantId?: string) => Promise<void>
  removeItem: (productId: string, cartItemId?: string, sizeGrams?: number | null) => Promise<void>
  setQuantity: (productId: string, quantity: number, cartItemId?: string, sizeGrams?: number | null) => Promise<void>
  clear: () => void
  reload: () => Promise<void>
  subtotal: number
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  cartId: string | null
  isLoading: boolean
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // For variant-based products with variants, check both product.id and sizeGrams
      // Same product with different sizes = separate cart items
      const usesVariants = hasVariants(action.product.category)
      const existing = state.items.find((item) => {
        if (item.product.id !== action.product.id) return false
        if (usesVariants) {
          // For variant-based products, match by sizeGrams
          return item.product.sizeGrams === action.product.sizeGrams
        }
        return true
      })
      
      if (existing) {
        return {
          items: state.items.map((item) => {
            if (item.product.id !== action.product.id) return item
            if (usesVariants && item.product.sizeGrams !== action.product.sizeGrams) return item
            return { ...item, quantity: item.quantity + action.quantity }
          }),
        }
      }
      return {
        items: [...state.items, { product: action.product, quantity: action.quantity }],
      }
    }
    case 'REMOVE_ITEM': {
      // For authenticated users, cartItemId is provided and unique per variant
      // For guest users, match by productId + sizeGrams for Malt products
      if (action.cartItemId) {
        return { items: state.items.filter((item) => item.cartItemId !== action.cartItemId) }
      }
      // Guest cart: match by productId + sizeGrams for variant-based products
      const itemToRemove = state.items.find((item) => item.product.id === action.productId)
      if (itemToRemove) {
        const usesVariants = hasVariants(itemToRemove.product.category)
        if (usesVariants && action.sizeGrams !== undefined) {
          return {
            items: state.items.filter(
              (item) =>
                !(item.product.id === action.productId && item.product.sizeGrams === action.sizeGrams)
            ),
          }
        }
      }
      return { items: state.items.filter((item) => item.product.id !== action.productId) }
    }
    case 'SET_QUANTITY': {
      // For authenticated users, cartItemId is provided and unique per variant
      if (action.cartItemId) {
        return {
          items: state.items
            .map((item) =>
              item.cartItemId === action.cartItemId
                ? { ...item, quantity: action.quantity }
                : item
            )
            .filter((item) => item.quantity > 0),
        }
      }
      // Guest cart: match by productId + sizeGrams for variant-based products
      const itemToUpdate = state.items.find((item) => item.product.id === action.productId)
      if (itemToUpdate) {
        const usesVariants = hasVariants(itemToUpdate.product.category)
        if (usesVariants && action.sizeGrams !== undefined) {
          return {
            items: state.items
              .map((item) =>
                item.product.id === action.productId && item.product.sizeGrams === action.sizeGrams
                  ? { ...item, quantity: action.quantity }
                  : item
              )
              .filter((item) => item.quantity > 0),
          }
        }
      }
      return {
        items: state.items
          .map((item) =>
            item.product.id === action.productId
              ? { ...item, quantity: action.quantity }
              : item
          )
          .filter((item) => item.quantity > 0),
      }
    }
    case 'CLEAR': {
      return { items: [] }
    }
    case 'REPLACE_ALL': {
      return { items: action.items }
    }
    default:
      return state
  }
}

interface CartProviderProps {
  children: React.ReactNode
}

/**
 * CartProvider
 *
 * Account-based cart architecture:
 * - Guest cart: Temporary, stored in localStorage
 * - User cart: Persistent, stored in database
 * - On login/register: Guest cart merges into user cart, then guest cart is cleared
 * - On logout: Clear in-memory state, but user cart remains in database
 *
 * Cart Behavior:
 * - If NOT authenticated: Use guest cart from localStorage
 * - If authenticated: Load cart from server (GET /api/cart), ignore localStorage
 * - CartContext switches cleanly when auth state changes
 */
export function CartProvider({ children }: CartProviderProps) {
  // Track if component has mounted on the client
  const [hasMounted, setHasMounted] = useState(false)
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const lastSnapshotRef = useRef<string | null>(null)
  const authContext = useAuth()
  const isAuthenticated = authContext.isAuthenticated
  const accessToken = authContext.accessToken

  /**
   * Mark component as mounted after client-side hydration.
   *
   * In App Router, components render on the server first, then hydrate on the client.
   * We must ensure localStorage access only happens after client mount to prevent
   * hydration mismatches between server-rendered HTML and client-rendered HTML.
   */
  useEffect(() => {
    setHasMounted(true)
  }, [])

  /**
   * Load cart based on authentication state
   * - Guest: Load from localStorage (ONLY when NOT authenticated)
   * - Authenticated: ALWAYS load from server (NEVER use localStorage)
   */
  const loadCart = useCallback(async () => {
    if (!hasMounted) return

    if (isAuthenticated && accessToken) {
      // User is authenticated - ALWAYS load from server, ignore localStorage
      setIsLoading(true)
      try {
        const response = await fetch('/api/cart', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setCartId(data.cartId || null)

          const cartItems: CartItem[] = (data.items || [])
            .map((item: { cartItemId?: string; product: Product; quantity: number }) => ({
              cartItemId: item.cartItemId,
              product: item.product,
              quantity: item.quantity,
            }))
            .filter((item: CartItem) => item.product && item.quantity > 0)

          dispatch({ type: 'REPLACE_ALL', items: cartItems })
        } else {
          // If fetch fails, start with empty cart
          dispatch({ type: 'REPLACE_ALL', items: [] })
          setCartId(null)
        }
      } catch (error) {
        console.error('[Cart] Failed to load cart from server:', error)
        dispatch({ type: 'REPLACE_ALL', items: [] })
        setCartId(null)
      } finally {
        setIsLoading(false)
      }
    } else {
      // User is NOT authenticated - load guest cart from localStorage
      // Clear any previous cartId from authenticated session
      setCartId(null)

      const id = getOrCreateCartId()
      setCartId(id || null)

      // For authenticated users, cart is loaded from API in loadCart()
      // Guest cart hydration from localStorage is handled separately and doesn't use static products
      dispatch({ type: 'REPLACE_ALL', items: [] })
    }
  }, [hasMounted, isAuthenticated, accessToken])

  /**
   * Load cart when auth state changes or on mount
   * This ensures cart is always loaded from correct source (server vs localStorage)
   */
  useEffect(() => {
    loadCart()
  }, [loadCart])

  /**
   * Watch for auth state changes and reload cart accordingly
   * This handles the case when user logs in/out
   */
  useEffect(() => {
    if (!hasMounted) return

    // When auth state changes, reload cart from appropriate source
    loadCart()
  }, [hasMounted, isAuthenticated, accessToken, loadCart])

  /**
   * Handle logout event - clear in-memory cart state
   * User cart remains in database, guest cart starts fresh
   */
  useEffect(() => {
    if (!hasMounted) return

    const handleLogout = () => {
      // Clear in-memory cart state
      // User cart remains in database
      // Clear guest cart from localStorage so guest cart starts fresh
      dispatch({ type: 'CLEAR' })
      setCartId(null)

      // Clear guest cart from localStorage
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('millet-n-joy/cart')
          window.localStorage.removeItem('millet-n-joy/cart-id')
        } catch {
          // Ignore errors
        }
      }
    }

    const handleCartReload = () => {
      // Reload cart from server after merge
      // This ensures merged cart is displayed immediately
      if (isAuthenticated && accessToken) {
        loadCart()
      }
    }

    window.addEventListener('auth:logout', handleLogout)
    window.addEventListener('cart:reload', handleCartReload)
    return () => {
      window.removeEventListener('auth:logout', handleLogout)
      window.removeEventListener('cart:reload', handleCartReload)
    }
  }, [hasMounted, isAuthenticated, accessToken, loadCart])

  /**
   * Persist cart based on authentication state
   * - Guest: Save to localStorage ONLY
   * - Authenticated: NEVER save to localStorage (cart is in database ONLY)
   * 
   * CRITICAL RULES:
   * - Guest users → cart stored ONLY in localStorage
   * - Authenticated users → cart stored ONLY in database
   * - Never save authenticated cart to localStorage
   * - Clear guest cart after successful merge (handled in AuthContext)
   */
  useEffect(() => {
    if (!hasMounted) return

    if (isAuthenticated) {
      // For authenticated users, cart is stored ONLY in database
      // NEVER save to localStorage when authenticated
      // This ensures cart persists across devices and sessions
      return
    }

    // Guest cart: Persist to localStorage ONLY when NOT authenticated
    if (!cartId) return

    // Ensure we have items before saving
    if (state.items.length === 0 && cartId) {
      // Cart is empty, clear localStorage
      try {
        window.localStorage.removeItem('millet-n-joy/cart')
        lastSnapshotRef.current = null
      } catch {
        // Ignore errors
      }
      return
    }

    const serializedItems = serializeCartItems(state.items)
    const snapshot = { cartId, items: serializedItems }
    const json = JSON.stringify(snapshot)

    if (json === lastSnapshotRef.current) {
      return
    }

    try {
      saveCartSnapshot(snapshot)
      lastSnapshotRef.current = json
    } catch (error) {
      console.error('[Cart] Error saving guest cart to localStorage:', error)
    }
  }, [state.items, cartId, hasMounted, isAuthenticated])

  const value: CartContextValue = useMemo(
    () => ({
      items: state.items,
      addItem: async (product, quantity = 1, variantId?: string) => {
        if (quantity <= 0) return

        // Check stock availability before adding
        const availableStock = product.stock ?? 0
        if (availableStock <= 0) {
          if (hasMounted) {
            setToast(`Sorry, ${product.name} is currently out of stock`)
            window.setTimeout(() => setToast(null), 3000)
          }
          return
        }

        // Check if adding this quantity would exceed stock
        const existingItem = state.items.find((item) => item.product.id === product.id)
        const currentQuantity = existingItem?.quantity ?? 0
        const requestedQuantity = currentQuantity + quantity

        if (requestedQuantity > availableStock) {
          if (hasMounted) {
            setToast(`Only ${availableStock} available in stock${currentQuantity > 0 ? ` (you have ${currentQuantity} in cart)` : ''}`)
            window.setTimeout(() => setToast(null), 3000)
          }
          return
        }

        // For authenticated users, save to database
        if (isAuthenticated && accessToken) {
          try {
            const response = await fetch('/api/cart/items', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: product.id,
                quantity,
                ...(variantId && { variantId }),
              }),
            })

            if (response.ok) {
              // Reload cart to get updated items with cartItemId
              await loadCart()
              // Show toast after mount
              if (hasMounted) {
                setToast(`${product.name} was added to your cart`)
                window.setTimeout(() => setToast(null), 2200)
              }
            } else {
              const errorData = await response.json().catch(() => ({}))
              const errorMessage = errorData.message || 'Failed to add item to cart'
              console.error('[Cart] Failed to add item to server:', errorMessage)
              if (hasMounted) {
                setToast(errorMessage)
                window.setTimeout(() => setToast(null), 3000)
              }
            }
          } catch (error) {
            console.error('[Cart] Error adding item:', error)
            if (hasMounted) {
              setToast('Failed to add item to cart. Please try again.')
              window.setTimeout(() => setToast(null), 3000)
            }
          }
        } else {
          // Guest user - add to in-memory state only (with stock check)
          const finalQuantity = Math.min(quantity, availableStock - currentQuantity)
          if (finalQuantity > 0) {
            if (hasMounted) {
              dispatch({ type: 'ADD_ITEM', product, quantity: finalQuantity })
              setToast(`${product.name} was added to your cart`)
              window.setTimeout(() => setToast(null), 2200)
            } else {
              dispatch({ type: 'ADD_ITEM', product, quantity: finalQuantity })
            }
          } else {
            if (hasMounted) {
              setToast(`Only ${availableStock} available in stock${currentQuantity > 0 ? ` (you have ${currentQuantity} in cart)` : ''}`)
              window.setTimeout(() => setToast(null), 3000)
            }
          }
        }
      },
      removeItem: async (productId: string, cartItemId?: string, sizeGrams?: number | null) => {
        // For authenticated users, delete from database using cartItemId (unique per variant)
        if (isAuthenticated && accessToken) {
          // Use provided cartItemId or find it
          const itemToRemove = cartItemId
            ? state.items.find((item) => item.cartItemId === cartItemId)
            : state.items.find((item) => item.product.id === productId && item.cartItemId)

          if (itemToRemove?.cartItemId) {
            try {
              const response = await fetch(
                `/api/cart/items/${itemToRemove.cartItemId}`,
                {
                  method: 'DELETE',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              )

              if (response.ok) {
                // Remove from in-memory state first for immediate UI update
                dispatch({ type: 'REMOVE_ITEM', productId, cartItemId: itemToRemove.cartItemId })
                // Reload cart from server to ensure sync with database
                await loadCart()
              } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
                console.error('[Cart] Failed to remove item from server:', errorData)
                // On error, reload cart to ensure UI matches server state
                await loadCart()
              }
            } catch (error) {
              console.error('[Cart] Error removing item:', error)
              // On error, reload cart to ensure UI matches server state
              await loadCart()
            }
          } else {
            // No cartItemId, just remove from in-memory state
            dispatch({ type: 'REMOVE_ITEM', productId, sizeGrams })
          }
        } else {
          // Guest user - remove from in-memory state (match by productId + sizeGrams for variant-based products)
          // Calculate updated items (state.items will update after dispatch)
          const itemToRemove = state.items.find((item) => item.product.id === productId)
          const usesVariants = itemToRemove?.product.category ? hasVariants(itemToRemove.product.category) : false
          const updatedItems = usesVariants && sizeGrams !== undefined
            ? state.items.filter(
                (item) =>
                  !(item.product.id === productId && item.product.sizeGrams === sizeGrams)
              )
            : state.items.filter((item) => item.product.id !== productId)

          // Update state
          dispatch({ type: 'REMOVE_ITEM', productId, sizeGrams })

          // Force immediate save to localStorage for guest cart
          if (typeof window !== 'undefined' && cartId) {
            try {
              const serializedItems = serializeCartItems(updatedItems)
              const snapshot = { cartId, items: serializedItems }
              const json = JSON.stringify(snapshot)
              saveCartSnapshot(snapshot)
              // Update ref to prevent duplicate saves in useEffect
              lastSnapshotRef.current = json
            } catch (error) {
              console.error('[Cart] Error saving guest cart:', error)
            }
          }
        }
      },
      setQuantity: async (productId, quantity, cartItemId?: string, sizeGrams?: number | null) => {
        if (quantity <= 0) {
          // If quantity is 0 or less, remove the item instead
          // Use provided cartItemId or find it
          const itemToRemove = cartItemId
            ? state.items.find((item) => item.cartItemId === cartItemId)
            : state.items.find((item) => item.product.id === productId && item.cartItemId)
          
          if (isAuthenticated && accessToken && itemToRemove?.cartItemId) {
            try {
              const response = await fetch(
                `/api/cart/items/${itemToRemove.cartItemId}`,
                {
                  method: 'DELETE',
                  credentials: 'include',
                }
              )

              if (response.ok) {
                dispatch({ type: 'REMOVE_ITEM', productId, cartItemId: itemToRemove.cartItemId })
                await loadCart()
              } else {
                await loadCart()
              }
            } catch (error) {
              console.error('[Cart] Error removing item:', error)
              await loadCart()
            }
          } else {
            dispatch({ type: 'REMOVE_ITEM', productId, sizeGrams })
          }
          return
        }

        // Use provided cartItemId or find the cart item
        const itemToUpdate = cartItemId
          ? state.items.find((item) => item.cartItemId === cartItemId)
          : state.items.find((item) => {
              if (item.product.id !== productId) return false
              const usesVariants = hasVariants(item.product.category)
              if (usesVariants && sizeGrams !== undefined) {
                return item.product.sizeGrams === sizeGrams
              }
              return true
            })

        if (!itemToUpdate) {
          console.error('[Cart] Item not found for quantity update:', productId)
          return
        }

        // Check stock availability
        const availableStock = itemToUpdate.product.stock ?? 0
        if (quantity > availableStock && availableStock > 0) {
          if (hasMounted) {
            setToast(`Only ${availableStock} available in stock`)
            window.setTimeout(() => setToast(null), 3000)
          }
          quantity = availableStock
        }

        // For authenticated users, update in database using cartItemId (unique per variant)
        if (isAuthenticated && accessToken && itemToUpdate.cartItemId) {
          try {
            const response = await fetch(`/api/cart/items/${itemToUpdate.cartItemId}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ quantity }),
            })

            if (response.ok) {
              // Update local state optimistically
              dispatch({ type: 'SET_QUANTITY', productId, quantity, cartItemId: itemToUpdate.cartItemId })
              // Reload cart to ensure sync with server
              await loadCart()
            } else {
              const errorData = await response.json().catch(() => ({}))
              const errorMessage = errorData.message || 'Failed to update quantity'
              console.error('[Cart] Failed to update quantity:', errorMessage)
              if (hasMounted) {
                setToast(errorMessage)
                window.setTimeout(() => setToast(null), 3000)
              }
              // Reload cart to get correct state from server
              await loadCart()
            }
          } catch (error) {
            console.error('[Cart] Error updating quantity:', error)
            if (hasMounted) {
              setToast('Failed to update quantity. Please try again.')
              window.setTimeout(() => setToast(null), 3000)
            }
            // Reload cart to get correct state from server
            await loadCart()
          }
        } else {
          // Guest user - update in-memory state (match by productId + sizeGrams for Malt)
          dispatch({ type: 'SET_QUANTITY', productId, quantity, sizeGrams })

          // Force immediate save to localStorage
          if (typeof window !== 'undefined' && cartId) {
            try {
              const serializedItems = serializeCartItems(state.items)
              const snapshot = { cartId, items: serializedItems }
              const json = JSON.stringify(snapshot)
              saveCartSnapshot(snapshot)
              lastSnapshotRef.current = json
            } catch (error) {
              console.error('[Cart] Error saving guest cart:', error)
            }
          }
        }
      },
      clear: () => dispatch({ type: 'CLEAR' }),
      reload: loadCart,
      subtotal: state.items.reduce((sum, item) => {
        // Exclude unavailable items from subtotal
        if (!item.product.inStock) {
          return sum
        }
        // Calculate discounted price for each item
        const originalPriceInPaise = item.product.price * 100 // Convert to paise
        const discountedPriceInPaise = calculateDiscountedPrice(
          originalPriceInPaise,
          item.product.discountPercent
        )
        const discountedPriceInRupees = discountedPriceInPaise / 100
        return sum + discountedPriceInRupees * item.quantity
      }, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((open) => !open),
      cartId,
      isLoading,
    }),
    [state.items, isOpen, cartId, hasMounted, isLoading, loadCart, isAuthenticated, accessToken]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 mb-[env(safe-area-inset-bottom)] px-4 sm:bottom-6">
          <div
            className="pointer-events-auto inline-flex items-center rounded-full bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg shadow-neutral-900/40"
            role="status"
            aria-live="polite"
          >
            <span className="mr-2 text-xs text-primary-300" aria-hidden="true">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}

