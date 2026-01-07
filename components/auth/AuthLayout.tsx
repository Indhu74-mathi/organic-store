'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle: string
    imageSrc?: string
}

export default function AuthLayout({
    children,
    title,
    subtitle,
    imageSrc = '/auth-bg-login.png',
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-stone-100 p-4 sm:p-6 lg:p-8">
            {/* Main Floating Box */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[500px] lg:max-w-[600px] overflow-hidden rounded-[2.5rem] bg-neutral-900 shadow-2xl"
            >
                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={imageSrc}
                        alt="Background"
                        fill
                        className="object-cover opacity-60"
                        priority
                    />
                    {/* Dark Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
                </div>

                {/* Content Layer (Overlaid) */}
                <div className="relative z-10 flex w-full flex-col px-8 py-10 sm:px-12">
                    {/* Branding */}
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex flex-col items-center group">
                            <span className="text-xl font-bold text-white tracking-widest uppercase opacity-90">Millets N Joy</span>
                        </Link>
                    </div>

                    {/* Header Text - Now White for visibility over image */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
                            {title}
                        </h2>
                        <p className="text-stone-300 text-sm max-w-[280px] mx-auto leading-relaxed">
                            {subtitle}
                        </p>
                    </motion.div>

                    {/* Form Container */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-1 border border-white/10"
                    >
                        <div className="bg-white rounded-[1.4rem] p-6 sm:p-8 shadow-inner">
                            {children}
                        </div>
                    </motion.div>

                    {/* Footer / Extra spacing */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-white/40">
                            &copy; {new Date().getFullYear()} Millets N Joy. All rights reserved.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
