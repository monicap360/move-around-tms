'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../lib/supabase-provider'

export default function SessionTest() {
  const { supabase } = useSupabase()
  const [sessionInfo, setSessionInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testSession = async () => {
      console.log('🧪 SESSION TEST START')
      
      try {
        // Test 1: Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔍 Current session:', session)
        console.log('❌ Session error:', error)
        
        // Test 2: Try to get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('👤 Current user:', user)
        console.log('❌ User error:', userError)
        
        // Test 3: Check auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('🔄 Auth state changed:', event, session?.user?.email)
        })
        
        setSessionInfo({
          session: session,
          user: user,
          sessionError: error,
          userError: userError,
          hasAccessToken: !!session?.access_token,
          hasRefreshToken: !!session?.refresh_token,
          expiresAt: session?.expires_at,
        })
        
      } catch (err) {
        console.error('💥 Session test error:', err)
        setSessionInfo({ error: err })
      } finally {
        setLoading(false)
      }
    }
    
    testSession()
  }, [supabase])

  const testLogin = async () => {
    console.log('🧪 Testing direct login...')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@movearoundtms.com',
        password: 'TestPass123!'
      })
      console.log('🔍 Login result:', data)
      console.log('❌ Login error:', error)
      
      if (data.session) {
        setSessionInfo(prev => ({ ...prev, loginTest: 'SUCCESS', newSession: data.session }))
      } else {
        setSessionInfo(prev => ({ ...prev, loginTest: 'FAILED', loginError: error }))
      }
    } catch (err) {
      console.error('💥 Login test error:', err)
      setSessionInfo(prev => ({ ...prev, loginTest: 'ERROR', loginError: err }))
    }
  }

  if (loading) {
    return <div className="p-8">🧪 Testing session...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Session Debug Test</h1>
      
      <button 
        onClick={testLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Direct Login
      </button>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">Session Info:</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4">
        <a href="/login" className="text-blue-500 underline">← Back to Login</a>
      </div>
    </div>
  )
}