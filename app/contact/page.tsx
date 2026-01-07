'use client'

import AnimatedPage from '@/components/AnimatedPage'
import GoogleMapEmbed from '@/components/ui/GoogleMapEmbed'

export default function ContactPage() {
    return (
        <AnimatedPage>
            <div className="bg-white py-16 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">Contact Us</h1>
                        <p className="mt-4 text-lg text-neutral-600">
                            We&apos;d love to hear from you. Visit our store or reach out with any questions about our traditional millet products.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2">
                        {/* Contact Details */}
                        <div className="flex flex-col gap-10">
                            <div>
                                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Store Location</h3>
                                <p className="text-neutral-600 leading-relaxed">
                                    Ground Floor, No. 120/2,3,4,<br />
                                    Karuppiah Street,<br />
                                    (Near State Bank of India)<br />
                                    Coimbatore - 641 001
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Call Us</h3>
                                <p className="text-neutral-600 mb-2">
                                    For orders and inquiries:
                                </p>
                                <a href="tel:+918072101964" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                                    +91 80721 01964
                                </a>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Email</h3>
                                <a href="mailto:support@milletsnjoy.com" className="text-lg text-primary-600 hover:text-primary-700 transition-colors">
                                    support@milletsnjoy.com
                                </a>
                            </div>

                            <div className="mt-4 p-6 bg-primary-50 rounded-2xl border border-primary-100">
                                <h4 className="font-semibold text-primary-900 mb-2">Business Hours</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm text-primary-800">
                                    <div>Monday - Saturday</div>
                                    <div className="font-medium">9:30 AM – 8:30 PM</div>
                                    <div>Sunday</div>
                                    <div className="font-medium">Closed</div>
                                </div>
                            </div>
                        </div>

                        {/* Google Map */}
                        <div className="h-full min-h-[400px]">
                            <GoogleMapEmbed height="100%" className="h-full min-h-[400px] shadow-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    )
}
