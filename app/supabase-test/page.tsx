'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../lib/supabase-provider'

export default function SupabaseTest() {
  const { supabase } = useSupabase()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      console.log('🧪 SUPABASE CONNECTION TEST')
      
      const testResults: any = {}
      
      try {
        // Test 1: Check if Supabase client exists
        testResults.clientExists = !!supabase
        console.log('1️⃣ Supabase client exists:', testResults.clientExists)
        
        // Test 2: Check environment variables
        testResults.envVars = {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
          keyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
        console.log('2️⃣ Environment variables:', testResults.envVars)
        
        // Test 3: Try a simple health check
        try {
          const { data, error } = await supabase.auth.getSession()
          testResults.authHealthCheck = {
            success: !error,
            error: error?.message,
            hasData: !!data
          }
          console.log('3️⃣ Auth health check:', testResults.authHealthCheck)
        } catch (err) {
          testResults.authHealthCheck = { error: 'Exception: ' + err }
        }
        
        // Test 4: Try to access Supabase directly
        try {
          const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/health')
          testResults.directAccess = {
            status: response.status,
            ok: response.ok
          }
          console.log('4️⃣ Direct Supabase access:', testResults.directAccess)
        } catch (err) {
          testResults.directAccess = { error: 'Connection failed: ' + err }
        }
        
        // Test 5: Try creating a user (the real test)
        try {
          console.log('5️⃣ Attempting user creation...')
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: `test${Date.now()}@movearoundtms.com`,
            password: 'TempPass123!'
          })
          
          testResults.userCreation = {
            success: !signUpError,
            error: signUpError?.message,
            user: signUpData?.user?.email
          }
          console.log('5️⃣ User creation test:', testResults.userCreation)
        } catch (err) {
          testResults.userCreation = { error: 'Exception: ' + err }
        }
        
      } catch (err) {
        testResults.overallError = 'Test failed: ' + err
      }
      
      setResults(testResults)
      setLoading(false)
    }
    
    runTests()
  }, [supabase])

  if (loading) {
    return <div className="p-8">🧪 Running Supabase connection tests...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Supabase Connection Test</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-4">
        <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
        <pre className="whitespace-pre-wrap text-sm overflow-auto">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
      
      <div className="space-y-2">
        <a href="/login" className="text-blue-500 underline block">← Back to Login</a>
        <a href="/session-test" className="text-purple-500 underline block">→ Session Test</a>
      </div>
    </div>
  )
}