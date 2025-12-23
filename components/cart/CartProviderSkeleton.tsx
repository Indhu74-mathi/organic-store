/**
 * CartProviderSkeleton - Minimal fallback for CartProvider
 *
 * Lightweight fallback that provides empty cart state during Suspense.
 * Prevents blank screens and ensures cart-dependent components render safely.
 */
export default function CartProviderSkeleton({
  children,
}: {
  children: React.ReactNode
}) {
  // Return children immediately - cart context will hydrate after Suspense resolves
  // This ensures page content is never blocked by cart loading
  return <>{children}</>
}

