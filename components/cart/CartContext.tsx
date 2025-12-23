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
  loadCartSnapshot,
  saveCartSnapshot,
  serializeCartItems,
} from '@/lib/cartStorage'
import { products } from '@/lib/products'
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
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'REPLACE_ALL'; items: CartItem[] }

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  setQuantity: (productId: string, quantity: number) => void
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
      const existing = state.items.find((item) => item.product.id === action.product.id)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === action.product.id
              ? { ...item, quantity: item.quantity + action.quantity }
              : item
          ),
        }
      }
      return {
        items: [...state.items, { product: action.product, quantity: action.quantity }],
      }
    }
    case 'REMOVE_ITEM': {
      return { items: state.items.filter((item) => item.product.id !== action.productId) }
    }
    case 'SET_QUANTITY': {
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
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

      const snapshot = loadCartSnapshot()
      if (snapshot && snapshot.items.length > 0) {
        const hydratedItems: CartItem[] = snapshot.items
          .map(({ productId, quantity }) => {
            const product = products.find((p) => p.id === productId)
            if (!product || quantity <= 0) return null
            return { product, quantity }
          })
          .filter((item): item is CartItem => item !== null)

        if (hydratedItems.length > 0) {
          dispatch({ type: 'REPLACE_ALL', items: hydratedItems })
        } else {
          dispatch({ type: 'REPLACE_ALL', items: [] })
        }
      } else {
        dispatch({ type: 'REPLACE_ALL', items: [] })
      }
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

    const serializedItems = serializeCartItems(state.items)
    const snapshot = { cartId, items: serializedItems }
    const json = JSON.stringify(snapshot)

    if (json === lastSnapshotRef.current) {
      return
    }

    saveCartSnapshot(snapshot)
    lastSnapshotRef.current = json
  }, [state.items, cartId, hasMounted, isAuthenticated])

  const value: CartContextValue = useMemo(
    () => ({
      items: state.items,
      addItem: async (product, quantity = 1) => {
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
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                productId: product.id,
                quantity,
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
      removeItem: async (productId: string) => {
        // For authenticated users, delete from database
        if (isAuthenticated && accessToken) {
          // Find the cartItemId for this product
          const itemToRemove = state.items.find(
            (item) => item.product.id === productId && item.cartItemId
          )

          if (itemToRemove?.cartItemId) {
            try {
              const response = await fetch(
                `/api/cart/items/${itemToRemove.cartItemId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              )

              if (response.ok) {
                // Remove from in-memory state
                dispatch({ type: 'REMOVE_ITEM', productId })
                // Reload cart to ensure sync with database
                await loadCart()
              } else {
                console.error('[Cart] Failed to remove item from server')
                // Still remove from in-memory state for better UX
                dispatch({ type: 'REMOVE_ITEM', productId })
              }
            } catch (error) {
              console.error('[Cart] Error removing item:', error)
              // Still remove from in-memory state for better UX
              dispatch({ type: 'REMOVE_ITEM', productId })
            }
          } else {
            // No cartItemId, just remove from in-memory state
            dispatch({ type: 'REMOVE_ITEM', productId })
          }
        } else {
          // Guest user - just remove from in-memory state
          dispatch({ type: 'REMOVE_ITEM', productId })
        }
      },
      setQuantity: (productId, quantity) =>
        dispatch({ type: 'SET_QUANTITY', productId, quantity }),
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

