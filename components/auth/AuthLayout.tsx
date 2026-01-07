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
        <div className="flex min-h-screen w-full items-center justify-center bg-stone-100 lg:p-8 sm:p-6 p-0">
            {/* Main Floating Box - Full screen on mobile, rounded box on desktop */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full h-screen sm:h-auto sm:max-w-[500px] lg:max-w-[600px] overflow-hidden sm:rounded-[2.5rem] rounded-none bg-neutral-900 shadow-2xl flex flex-col"
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
                <div className="relative z-10 flex w-full flex-col flex-1 px-5 py-8 sm:px-12 sm:py-10">
                    {/* Branding */}
                    <div className="flex justify-center mb-6 sm:mb-8">
                        <Link href="/" className="flex flex-col items-center group">
                            <span className="text-xl font-bold text-white tracking-widest uppercase opacity-90">Millets N Joy</span>
                        </Link>
                    </div>

                    {/* Header Text - Now White for visibility over image */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="text-center mb-8 sm:mb-10"
                    >
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 sm:mb-3">
                            {title}
                        </h2>
                        <p className="text-stone-300 text-sm max-w-[280px] mx-auto leading-relaxed">
                            {subtitle}
                        </p>
                    </motion.div>

                    {/* Form Container - Wider on mobile by reducing inner padding */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-0.5 sm:p-1 border border-white/10"
                    >
                        <div className="bg-white rounded-[1.3rem] sm:rounded-[1.4rem] p-5 sm:p-8 shadow-inner">
                            {children}
                        </div>
                    </motion.div>

                    {/* Footer / Extra spacing */}
                    <div className="mt-auto pt-8 pb-4 text-center">
                        <p className="text-xs text-white/40">
                            &copy; {new Date().getFullYear()} Millets N Joy. All rights reserved.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
