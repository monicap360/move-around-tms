'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../../lib/supabase-provider'

export default function AuthCallback() {
  const { supabase } = useSupabase()
  const [status, setStatus] = useState('Processing authentication...')
  
  useEffect(() => {
    console.log('🔥 CALLBACK DEBUG START')
    console.log('📍 URL:', window.location.href)
    console.log('🔍 Search params:', window.location.search)
    console.log('🔗 Hash:', window.location.hash)
    
    const checkSession = async () => {
      try {
        // Wait a moment for Supabase to process the callback
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔍 Callback session check:', session)
        console.log('❌ Callback error:', error)
        
        if (session) {
          console.log('✅ Session found! User:', session.user?.email)
          setStatus(`Session found for ${session.user?.email}! Redirecting...`)
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
        } else {
          console.log('❌ No session in callback')
          setStatus('No session created. Check console for details.')
          setTimeout(() => {
            window.location.href = '/login?error=callback_no_session'
          }, 5000) // Longer delay to see what's happening
        }
      } catch (err) {
        console.error('💥 Callback error:', err)
        setStatus('Callback error: ' + err)
        setTimeout(() => {
          window.location.href = '/login?error=callback_exception'
        }, 5000)
      }
    }
    
    checkSession()
  }, [supabase])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Processing Authentication</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>🔍 URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
          <p>📊 Check console (F12) for detailed logs</p>
        </div>
      </div>
    </div>
  )
}
