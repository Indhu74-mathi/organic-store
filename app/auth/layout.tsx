import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Authentication',
    template: '%s | Millets N Joy',
  },
  description: 'Sign in or create an account to continue shopping.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

