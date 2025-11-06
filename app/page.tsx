'use client'

import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    // Immediately redirect to dashboard - no login required
    console.log('🚀 Redirecting to dashboard - login bypassed')
    window.location.href = '/dashboard'
  }, [])

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gray-50 text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">
        MoveAround TMS 🚚
      </h1>
      <p className="text-gray-600">Redirecting to dashboard...</p>
    </main>
  );
}
