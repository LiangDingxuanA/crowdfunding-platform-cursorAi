'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <main className="relative h-screen w-full">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute min-w-full min-h-full object-cover"
        >
          <source src="/videos/city-aerial.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6">
        <Link href="/" className="text-white text-2xl font-bold">
          Crowdfunding Platform
        </Link>
        <div className="space-x-4">
          {!session ? (
            <>
          <Link
            href="/auth/login"
            className="text-white hover:text-gray-200 px-4 py-2 rounded-lg border border-white"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg"
          >
            Sign Up
          </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="text-white hover:text-gray-200 px-4 py-2 rounded-lg border border-white"
            >
              Dashboard
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h1 className="text-white text-5xl md:text-6xl font-bold mb-6">
          Fund Your Dreams
        </h1>
        <p className="text-white text-xl md:text-2xl mb-8 max-w-2xl">
          Join our community of innovators and bring your ideas to life through the power of crowdfunding.
        </p>
        <Link
          href={session ? "/dashboard" : "/auth/signup"}
          className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold"
        >
          {session ? "Go to Dashboard" : "Start Your Project"}
        </Link>
      </div>
    </main>
  )
}
