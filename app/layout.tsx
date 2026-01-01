import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Millets N Joy | Traditional Millet Products',
    template: '%s | Millets N Joy',
  },
  description:
    'Discover premium malt, saadha podi, and traditional foods made with quality ingredients and authentic preparation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {/* 
          Server layout ALWAYS renders children.
          Providers handles client-only logic safely.
          Ambient gradient overlay is applied via CSS ::before on body.
        */}
        <Providers>
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
