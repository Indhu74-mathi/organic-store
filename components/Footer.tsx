'use client'

import Link from 'next/link'
import GoogleMapEmbed from './ui/GoogleMapEmbed'

/**
 * Global Footer Component
 *
 * Features:
 * - Shop address and contact information
 * - FSSAI registration details
 * - Social media links (Instagram)
 * - Quick links to important pages
 * - Copyright information
 */
export default function Footer() {
  return (
    <footer id="main-footer" className="bg-neutral-900 text-neutral-300 border-t border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          {/* Brand & Description */}
          <div className="space-y-4 col-span-2 sm:col-span-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Millets N Joy</h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-400">
              Premium malt, saadha podi, and traditional millet products. Your trusted source for quality products made with authentic preparation.
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-500">Contact Us</h4>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <p className="font-medium text-neutral-200">Address</p>
                <p className="text-neutral-400 leading-relaxed">
                  Ground Floor, No. 120/2,3,4,<br />
                  Karuppiah Street,<br />
                  (Near State Bank of India)<br />
                  Coimbatore - 641 001
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="space-y-1">
                  <p className="font-medium text-neutral-200">Phone</p>
                  <a
                    href="tel:+918072101964"
                    className="text-neutral-400 hover:text-primary-400 transition-colors block text-nowrap"
                  >
                    +91 80721 01964
                  </a>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-neutral-200">FSSAI</p>
                  <p className="text-neutral-400 text-nowrap">
                    22425042001030
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map & Social Combined for spacing */}
          <div className="space-y-4">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-500">Find Us</h4>
            <div className="h-32 sm:h-40 w-full rounded-xl overflow-hidden ring-1 ring-neutral-800">
              <GoogleMapEmbed height="100%" className="opacity-80 hover:opacity-100 transition-opacity grayscale-[0.5] hover:grayscale-0 duration-500" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Quick Links</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <Link
                href="/shop"
                className="text-neutral-400 hover:text-primary-400 transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/blog"
                className="text-neutral-400 hover:text-primary-400 transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/orders"
                className="text-neutral-400 hover:text-primary-400 transition-colors"
              >
                My Orders
              </Link>
            </nav>
          </div>

          {/* FSSAI & Social */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Follow Us</h4>
            <div className="space-y-6">
              <a
                href="https://www.instagram.com/milletsnjoy"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 text-sm text-neutral-400 hover:text-primary-400 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 group-hover:bg-primary-600/10 transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>@milletsnjoy</span>
              </a>

            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-neutral-800/50">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-xs text-neutral-500">
              © {new Date().getFullYear()} Millets N Joy. All rights reserved.
            </p>
            <div className="flex gap-8 text-xs font-medium text-neutral-500">
              <Link
                href="/terms"
                className="hover:text-primary-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="hover:text-primary-400 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

