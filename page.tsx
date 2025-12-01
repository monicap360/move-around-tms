'use client'

import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-10">
      <h1 className="text-4xl font-bold text-green-600 mb-4">
        🚚 MoveAround TMS
      </h1>

      <p className="text-gray-700 text-lg mb-6">
        The system is live and running.
      </p>

      <p className="text-gray-500 mb-10">
        Next.js + Supabase + Monica 🚀
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700"
      >
        👉 Enter Dashboard
      </Link>
    </main>
  )
}
