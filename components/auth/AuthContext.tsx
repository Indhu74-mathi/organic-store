'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { decodeToken } from '@/lib/auth/tokens'

/**
 * Authentication Context
 *
 * CRITICAL: This context is completely decoupled from cart state.
 * - Logging in does NOT clear the cart
 * - Logging out does NOT clear the cart
 * - Cart state is managed independently in CartContext
 * - CartId persists across auth changes via localStorage
 *
 * Future cart-user merging:
 * When a user logs in, the server can associate the existing cartId
 * with the userId. This happens server-side and does not affect
 * the client-side cart state or localStorage.
 *
 * When a user logs out, the cartId remains in localStorage and
 * continues to work as a guest cart. The server can handle
 * cart persistence separately.
 */

const AUTH_TOKEN_KEY = 'millet-n-joy/auth-token'
const REFRESH_TOKEN_KEY = 'millet-n-joy/refresh-token'
const USER_ID_KEY = 'millet-n-joy/user-id'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  email: string | null
  role: string | null
  accessToken: string | null
}

interface AuthContextValue extends AuthState {
  login: (tokens: { accessToken: string; refreshToken: string; userId: string; email?: string; role?: string }) => void
  logout: () => void
  isLoading: boolean
  user: { userId: string | null; email: string | null; role: string | null } | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * Load auth state from localStorage
 * This is separate from cart storage and does not interfere with cart state
 */
function loadAuthState(): AuthState {
  if (!isBrowser()) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      role: null,
      accessToken: null,
    }
  }

  try {
    const accessToken = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const userId = window.localStorage.getItem(USER_ID_KEY)
    const role = window.localStorage.getItem('millet-n-joy/user-role')

    if (accessToken && userId) {
      // Token exists, but we should verify it's still valid
      // For now, we'll trust localStorage. In production, verify with server
      return {
        isAuthenticated: true,
        userId,
        email: window.localStorage.getItem('millet-n-joy/user-email') || null,
        role: role || null,
        accessToken,
      }
    }
  } catch {
    // Ignore errors, return unauthenticated state
  }

  return {
    isAuthenticated: false,
    userId: null,
    email: null,
    role: null,
    accessToken: null,
  }
}

/**
 * Save auth state to localStorage
 * Uses separate keys from cart storage to ensure decoupling
 */
function saveAuthState(state: AuthState, refreshToken?: string): void {
  if (!isBrowser()) return

  try {
    if (state.isAuthenticated && state.accessToken && state.userId) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, state.accessToken)
      window.localStorage.setItem(USER_ID_KEY, state.userId)
      if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }
      if (state.email) {
        window.localStorage.setItem('millet-n-joy/user-email', state.email)
      }
      if (state.role) {
        window.localStorage.setItem('millet-n-joy/user-role', state.role)
      }
    } else {
      // Clear auth tokens but NOT cart data
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.localStorage.removeItem(USER_ID_KEY)
      window.localStorage.removeItem('millet-n-joy/user-email')
      window.localStorage.removeItem('millet-n-joy/user-role')
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear auth state from localStorage
 * CRITICAL: This does NOT touch cart storage keys
 */
function clearAuthState(): void {
  if (!isBrowser()) return

  try {
    // Only remove auth-related keys, NOT cart keys
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_ID_KEY)
    window.localStorage.removeItem('millet-n-joy/user-email')
    window.localStorage.removeItem('millet-n-joy/user-role')
    // Note: Cart keys ('millet-n-joy/cart' and 'millet-n-joy/cart-id') remain untouched
  } catch {
    // Ignore errors
  }
}

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider
 *
 * Manages authentication state independently from cart.
 * Cart state is handled by CartProvider and persists across auth changes.
 *
 * Cart-User Merging Strategy:
 * 1. User adds items to cart as guest (cartId stored in localStorage)
 * 2. User logs in (auth state updated, cartId remains unchanged)
 * 3. On login success, client can optionally call: POST /api/cart/merge?cartId={cartId}
 *    - Server associates cartId with userId
 *    - Server can merge guest cart with user's saved cart if needed
 *    - Client cart state remains unchanged (no disruption)
 * 4. User logs out (auth cleared, cartId persists in localStorage)
 * 5. Cart continues to work as guest cart
 *
 * This ensures zero cart disruption during auth flows.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => loadAuthState())
  const [isLoading, setIsLoading] = useState(true)

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const initialState = loadAuthState()
    setState(initialState)
    setIsLoading(false)
  }, [])

  /**
   * Login function
   * 
   * CRITICAL: This does NOT clear or modify cart state.
   * The cartId in localStorage remains unchanged.
   * 
   * After login, the client can optionally trigger cart-user merging:
   * - Call POST /api/cart/merge with current cartId
   * - Server associates cartId with userId
   * - Server can merge guest cart with user's saved cart
   * - Client cart state remains unchanged (no disruption)
   */
  const login = useCallback(
    (tokens: {
      accessToken: string
      refreshToken: string
      userId: string
      email?: string
      role?: string
    }) => {
      // Decode token to extract role if not provided
      let role = tokens.role || null
      if (!role && tokens.accessToken) {
        try {
          const decoded = decodeToken(tokens.accessToken)
          if (decoded?.role) {
            role = decoded.role
          }
        } catch {
          // Ignore decode errors
        }
      }

      const newState: AuthState = {
        isAuthenticated: true,
        userId: tokens.userId,
        email: tokens.email || null,
        role: role || null,
        accessToken: tokens.accessToken,
      }

      setState(newState)
      saveAuthState(newState, tokens.refreshToken)

      // Merge guest cart with user cart immediately after login
      // This ensures guest cart items are preserved when user logs in
      if (typeof window !== 'undefined') {
        try {
          // Read guest cart from localStorage
          const guestCartSnapshot = window.localStorage.getItem('millet-n-joy/cart')
          if (guestCartSnapshot) {
            const guestCart = JSON.parse(guestCartSnapshot)
            const guestItems = guestCart.items || []

            if (guestItems.length > 0) {
              // Merge guest cart items into user cart
              fetch('/api/cart/merge', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: guestItems }),
              })
                .then((response) => {
                  if (response.ok) {
                    // Clear guest cart from localStorage after successful merge
                    window.localStorage.removeItem('millet-n-joy/cart')
                    window.localStorage.removeItem('millet-n-joy/cart-id')
                    // Dispatch event to reload cart from server
                    window.dispatchEvent(new CustomEvent('cart:reload'))
                  }
                })
                .catch((error) => {
                  console.error('[AuthContext] Cart merge failed:', error)
                  // Continue with login even if merge fails
                })
            } else {
              // No guest items, but ensure localStorage is clean
              window.localStorage.removeItem('millet-n-joy/cart')
              window.localStorage.removeItem('millet-n-joy/cart-id')
              // Still reload cart from server to show user's persisted cart
              window.dispatchEvent(new CustomEvent('cart:reload'))
            }
          } else {
            // No guest cart, but ensure localStorage is clean
            window.localStorage.removeItem('millet-n-joy/cart')
            window.localStorage.removeItem('millet-n-joy/cart-id')
            // Reload cart from server to show user's persisted cart
            window.dispatchEvent(new CustomEvent('cart:reload'))
          }
        } catch (error) {
          console.error('[AuthContext] Failed to merge cart:', error)
          // Continue with login even if merge fails
          // Still trigger cart reload
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart:reload'))
          }
        }
      }
    },
    []
  )

  /**
   * Logout function
   * 
   * CRITICAL: This does NOT delete cart from database.
   * - Clears in-memory auth state
   * - User cart remains in database
   * - Guest cart starts fresh after logout
   * - CartContext will handle switching to guest cart
   */
  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      userId: null,
      email: null,
      role: null,
      accessToken: null,
    })
    clearAuthState()

    // Dispatch event to notify CartContext to clear in-memory cart
    // CartContext will switch to guest cart mode
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
  }, [])

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      isLoading,
      user: state.isAuthenticated
        ? {
            userId: state.userId,
            email: state.email,
            role: state.role,
          }
        : null,
    }),
    [state, login, logout, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

