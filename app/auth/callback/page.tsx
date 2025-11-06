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
        
        // Check URL for session fragments (hash-based auth)
        const hash = window.location.hash
        if (hash) {
          console.log('🔗 Hash found:', hash)
          // Let Supabase process the hash
          console.log('🔄 Processing auth hash...')
          await new Promise(resolve => setTimeout(resolve, 1000)) // Give Supabase time to process
        }
        
        // For PKCE flow, Supabase handles the code exchange automatically
        // We just need to check if we have a session
        console.log('🔄 Checking for session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('🔍 Session data:', session)
        console.log('❌ Session error:', sessionError)
        
        if (sessionError) {
          console.error('❌ Session error details:', sessionError)
          setStatus(`Session error: ${sessionError.message}`)
          setTimeout(() => {
            window.location.href = '/login?error=' + encodeURIComponent(sessionError.message)
          }, 3000)
          return
        }
        
        if (session && session.user) {
          console.log('✅ Authentication successful!')
          console.log('👤 User email:', session.user.email)
          console.log('👤 User ID:', session.user.id)
          console.log('🎯 Provider:', session.user.app_metadata?.provider)
          console.log('🔐 Access token present:', !!session.access_token)
          console.log('🕒 Token expires at:', session.expires_at)
          
          setStatus('Success! Redirecting to dashboard...')
          
          // Test if we can make an authenticated request
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            console.log('🧪 Test getUser result:', userData, userError)
          } catch (testErr) {
            console.log('🧪 Test getUser error:', testErr)
          }
          
          // Successful authentication - immediate redirect
          console.log('🚀 Redirecting to dashboard...')
          window.location.href = '/dashboard'
        } else {
          console.log('⚠️ No session found - authentication may still be processing')
          console.log('🔄 Session data was:', session)
          console.log('🔄 Waiting for session to be established...')
          
          setStatus('Waiting for session to establish...')
          
          // Try multiple times with increasing delays
          let retryCount = 0
          const maxRetries = 5
          
          const retryCheck = async () => {
            retryCount++
            console.log(`🔄 Retry attempt ${retryCount}/${maxRetries}`)
            
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession()
            console.log(`🔍 Retry ${retryCount} session:`, retrySession)
            console.log(`❌ Retry ${retryCount} error:`, retryError)
            
            if (retrySession && retrySession.user) {
              console.log('✅ Session established on retry!')
              console.log('👤 Retry user:', retrySession.user.email)
              window.location.href = '/dashboard'
            } else if (retryCount < maxRetries) {
              console.log(`⏳ Retry ${retryCount} failed, trying again in ${retryCount * 1000}ms...`)
              setTimeout(retryCheck, retryCount * 1000)
            } else {
              console.log('⚠️ All retries exhausted, no session established')
              setStatus('Authentication failed. Redirecting to login...')
              setTimeout(() => {
                window.location.href = '/login?error=session_timeout'
              }, 2000)
            }
          }
          
          // Start first retry after 1 second
          setTimeout(retryCheck, 1000)
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
