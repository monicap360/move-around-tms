'use client'

import { useEffect } from 'react'
import { useSupabase } from '../../lib/supabase-provider'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const { supabase } = useSupabase()
  const router = useRouter()
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started')
        console.log('Current URL:', window.location.href)
        console.log('URL hash:', window.location.hash)
        console.log('URL search:', window.location.search)
        
        // First, try to exchange any auth code for session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
        }
        
        // If no session, try to handle OAuth callback
        if (!sessionData.session) {
          console.log('No existing session, checking for OAuth callback')
          
          const { data: authData, error: authError } = await supabase.auth.getUser()
          
          if (authError) {
            console.error('Auth error:', authError)
            setTimeout(() => {
              window.location.href = '/login?error=auth_failed'
            }, 2000)
            return
          }
          
          if (authData.user) {
            console.log('User found via getUser:', authData.user.email)
            // Force redirect to dashboard
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 1000)
            return
          }
        }
        
        if (sessionData.session) {
          console.log('Session found, user:', sessionData.session.user.email)
          // Successful authentication, force redirect to dashboard
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        } else {
          console.log('No session found, redirecting to login')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        }
      } catch (err) {
        console.error('Callback processing error:', err)
        setTimeout(() => {
          router.push('/login?error=auth_failed')
        }, 2000)
      }
    }
    
    handleAuthCallback()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Signing you in...</p>
      </div>
    </div>
  )
}