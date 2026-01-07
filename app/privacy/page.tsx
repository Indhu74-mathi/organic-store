'use client'

import AnimatedPage from '@/components/AnimatedPage'

export default function PrivacyPage() {
    return (
        <AnimatedPage>
            <div className="bg-white py-16 sm:py-24">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl mb-8">Privacy Policy</h1>

                    <div className="space-y-8 text-neutral-600 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Information We Collect</h2>
                            <p>
                                We collect information you provide directly to us when you create an account, place an order, or contact us. This may include your name, email address, phone number, and shipping address.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. How We Use Your Information</h2>
                            <p>
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc pl-6 mt-2 space-y-2">
                                <li>Process and fulfill your orders</li>
                                <li>Communicate with you about your orders and our products</li>
                                <li>Improve our website and services</li>
                                <li>Send you marketing communications (if you have opted in)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. Data Security</h2>
                            <p>
                                We take reasonable measures to protect your personal information from loss, theft, misuse, and unauthorized access. However, no internet transmission is ever completely secure or error-free.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Sharing of Information</h2>
                            <p>
                                We do not sell or rent your personal information to third parties. We may share your information with service providers who help us with our business operations, such as shipping companies and payment processors.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Cookies</h2>
                            <p>
                                We use cookies to enhance your experience on our website. Cookies are small data files stored on your device that help us remember your preferences and understand how you use our site.
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
