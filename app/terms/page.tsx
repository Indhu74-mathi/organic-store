'use client'

import AnimatedPage from '@/components/AnimatedPage'

export default function TermsPage() {
    return (
        <AnimatedPage>
            <div className="bg-white py-16 sm:py-24">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl mb-8">Terms and Conditions</h1>

                    <div className="space-y-8 text-neutral-600 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this website&apos;s particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. Products & Orders</h2>
                            <p>
                                All products listed on the website are subject to availability. We reserve the right to limit the quantity of products we supply, supply only part of an order or divide orders. Prices for our products are subject to change without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. Shipping & Delivery</h2>
                            <p>
                                We aim to process and ship orders as quickly as possible. Delivery times may vary depending on your location and the shipping method selected. We are not responsible for delays outside of our control.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Intellectual Property</h2>
                            <p>
                                The name &quot;Millets N Joy&quot;, the logo, and all content on this website are the intellectual property of Millets N Joy. You may not use, reproduce, or distribute any part of this website without our prior written consent.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Governing Law</h2>
                            <p>
                                These terms shall be governed by and construed in accordance with the laws of India, and any disputes relating to these terms and conditions will be subject to the exclusive jurisdiction of the courts of Coimbatore, Tamil Nadu.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-neutral-100">
                            <p className="text-sm text-neutral-500">
                                Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    )
}
