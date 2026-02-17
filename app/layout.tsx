import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://milletsnjoy.com'),

  // ✅ GOOGLE SEARCH CONSOLE VERIFICATION
  verification: {
    google: "S05ErTr9nTpeH3o4v2VdyDqWEQxv1pRCOy2UyqpQVzY",
  },

  title: {
    default: 'Millets N Joy | Premium Organic Millet & Malt Products',
    template: '%s | Millets N Joy',
  },

  description:
    'Shop premium organic malt, saadha podi, and traditional millet products. 100% natural, preservative-free, and homemade style. Delivery available across India.',

  keywords: [
    'millets',
    'organic food',
    'health mix',
    'millet malt',
    'traditional food',
    'healthy snacks',
    'millets n joy',
    'saadha podi',
    'organic millet',
    'buy millets online'
  ],

  authors: [{ name: 'Millets N Joy' }],
  creator: 'Millets N Joy',
  publisher: 'Millets N Joy',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    title: 'Millets N Joy | Premium Organic Millet & Malt Products',
    description: 'Shop premium organic millet products. 100% natural and homemade style.',
    url: 'https://milletsnjoy.com',
    siteName: 'Millets N Joy',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/Logo.png',
        width: 1200,
        height: 630,
        alt: 'Millets N Joy - Premium Organic Millet Products',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Millets N Joy | Premium Organic Millet & Malt Products',
    description: 'Premium organic millet products for a healthy lifestyle.',
    creator: '@milletsnjoy',
    images: ['/Logo.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: '/Logo.png',
  },

  manifest: '/site.webmanifest',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Millets N Joy',
  url: 'https://milletsnjoy.com',
  logo: 'https://milletsnjoy.com/logo.png',
  sameAs: [
    'https://www.instagram.com/milletsnjoy',
    'https://facebook.com/milletsnjoy',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-8072101964',
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: 'en',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Ground Floor, No. 120/2,3,4, Karuppiah Street',
    addressLocality: 'Coimbatore',
    postalCode: '641001',
    addressCountry: 'IN',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>

        {/* ✅ GOOGLE ANALYTICS */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9V7H04X7D0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9V7H04X7D0');
          `}
        </Script>

        {/* ✅ GOOGLE TAG MANAGER */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];
            w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;
            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-TKXSRMB4');
          `}
        </Script>

      </head>

      <body className="min-h-screen">

        {/* ✅ GTM NOSCRIPT */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TKXSRMB4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
