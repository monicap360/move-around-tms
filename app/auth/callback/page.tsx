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
        
        setStatus('Processing authentication...')
        
        // Check for OAuth error in URL
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        
        if (error) {
          console.error('❌ OAuth error from provider:', error, errorDescription)
          setStatus(`Authentication failed: ${error}`)
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(errorDescription || error))
          }, 3000)
          return
        }
        
        // For PKCE flow, Supabase handles the code exchange automatically
        // We just need to check if we have a session
        console.log('🔄 Checking for session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          setStatus(`Session error: ${sessionError.message}`)
          setTimeout(() => {
            router.push('/login?error=' + encodeURIComponent(sessionError.message))
          }, 3000)
          return
        }
        
        if (session && session.user) {
          console.log('✅ Authentication successful!')
          console.log('👤 User:', session.user.email)
          console.log('🎯 Provider:', session.user.app_metadata?.provider)
          console.log('🔐 Session:', session.access_token ? 'Valid' : 'No token')
          
          setStatus('Success! Redirecting to dashboard...')
          
          // Successful authentication - immediate redirect
          window.location.href = '/dashboard'
        } else {
          console.log('⚠️ No session found - authentication may still be processing')
          console.log('🔄 Waiting for session to be established...')
          
          // Try again after a short delay - sometimes sessions take a moment
          setTimeout(async () => {
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession()
            
            if (retrySession && retrySession.user) {
              console.log('✅ Session established on retry!')
              window.location.href = '/dashboard'
            } else {
              console.log('⚠️ Still no session after retry')
              setStatus('Authentication incomplete. Redirecting to login...')
              setTimeout(() => {
                router.push('/login?error=no_session_established')
              }, 2000)
            }
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
