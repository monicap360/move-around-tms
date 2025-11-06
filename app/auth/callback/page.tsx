'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../../lib/supabase-provider'

export default function AuthCallback() {
  const { supabase } = useSupabase()
  const [status, setStatus] = useState('Processing authentication...')
  
  useEffect(() => {
    console.log('� SIMPLE AUTH CALLBACK START')
    
    // Simple approach - just redirect to dashboard and let middleware handle auth
    const timer = setTimeout(() => {
      console.log('� Simple redirect to dashboard')
      window.location.href = '/dashboard'
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">{status}</p>
        <p className="text-sm text-gray-500 mt-2">Check the browser console for detailed logs</p>
      </div>
    </div>
  )
}
