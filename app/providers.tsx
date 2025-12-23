'use client'

import { ReactNode } from 'react'
import Header from '@/components/Header'
import FloatingShopButton from '@/components/FloatingShopButton'
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton'
import { CartProvider } from '@/components/cart/CartContext'
import { AuthProvider } from '@/components/auth/AuthContext'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Providers (STABLE VERSION)
 *
 * GUARANTEES:
 * - children render EXACTLY ONCE
 * - no Suspense around routing content
 * - no conditional rendering
 * - no white screens
 * - navigation is deterministic
 *
 * IMPORTANT:
 * - All client-only logic must be inside useEffect
 *   inside CartProvider / AuthProvider
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        {/* Global UI (never remounts) */}
        <div className="min-h-screen" style={{ border: 'none', boxShadow: 'none' }}>
          <Header />
          <main className="flex-1" style={{ border: 'none', boxShadow: 'none' }}>{children}</main>
          <FloatingWhatsAppButton />
          <FloatingShopButton />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}
