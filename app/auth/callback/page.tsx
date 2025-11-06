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
        
        // Extract the code from URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        
        console.log('🔑 Auth code:', code ? 'Present' : 'Missing')
        console.log('❌ Auth error:', error || 'None')
        
        if (error) {
          console.error('❌ OAuth error from provider:', error)
          setStatus(`Authentication failed: ${error}`)
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(error))
          }, 3000)
          return
        }
        
        if (!code) {
          console.error('❌ No authorization code found')
          setStatus('No authorization code received')
          setTimeout(() => {
            router.push('/login?error=no_code')
          }, 3000)
          return
        }
        
        // Exchange code for session using exchangeCodeForSession
        console.log('🔄 Exchanging code for session...')
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
          console.error('❌ Code exchange error:', exchangeError)
          setStatus(`Session exchange failed: ${exchangeError.message}`)
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(exchangeError.message))
          }, 3000)
          return
        }
        
        if (data.session && data.user) {
          console.log('✅ Authentication successful!')
          console.log('👤 User:', data.user.email)
          console.log('🎯 Provider:', data.user.app_metadata?.provider)
          console.log('🔐 Session:', data.session.access_token ? 'Created' : 'Missing token')
          
          setStatus('Success! Redirecting to dashboard...')
          
          // Successful authentication - redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        } else {
          console.log('⚠️ No session created after code exchange')
          setStatus('Failed to create session. Redirecting to login...')
          setTimeout(() => {
            router.push('/login?error=no_session_created')
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
