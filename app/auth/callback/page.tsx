'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../../lib/supabase-provider'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [status, setStatus] = useState('Processing authentication...')
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🚀 Auth callback started')
        console.log('📍 Current URL:', window.location.href)
        console.log('🔗 URL hash:', window.location.hash)
        console.log('🔍 URL search:', window.location.search)
        
        setStatus('Exchanging authorization code...')
        
        // Handle the auth callback - this exchanges the code for a session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Auth callback error:', error)
          setStatus(`Authentication failed: ${error.message}`)
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(error.message))
          }, 3000)
          return
        }
        
        if (data.session) {
          console.log('✅ Authentication successful!')
          console.log('👤 User:', data.session.user.email)
          console.log('🎯 Provider:', data.session.user.app_metadata?.provider)
          
          setStatus('Success! Redirecting to dashboard...')
          
          // Successful authentication
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        } else {
          console.log('⚠️ No session found in callback')
          setStatus('No session found. Redirecting to login...')
          setTimeout(() => {
            router.push('/login?error=no_session')
          }, 2000)
        }
      } catch (err) {
        console.error('💥 Callback processing error:', err)
        setStatus('Authentication error occurred')
        setTimeout(() => {
          router.push('/login?error=callback_error')
        }, 2000)
      }
    }
    
    handleAuthCallback()
  }, [supabase, router])

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
