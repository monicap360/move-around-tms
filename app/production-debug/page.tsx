'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '../lib/supabase-provider'

export default function ProductionDebugPage() {
  const { supabase } = useSupabase()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        environment: {
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
          origin: typeof window !== 'undefined' ? window.location.origin : 'server',
          pathname: typeof window !== 'undefined' ? window.location.pathname : 'server',
          nodeEnv: process.env.NODE_ENV,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      }

      try {
        const { data: session, error } = await supabase.auth.getSession()
        info.auth = {
          hasSession: !!session.session,
          sessionUser: session.session?.user?.email || 'No user',
          error: error?.message || 'No error',
        }
      } catch (err) {
        info.auth = {
          error: 'Failed to check auth: ' + String(err)
        }
      }

      setDebugInfo(info)
    }

    gatherDebugInfo()
  }, [supabase])

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })
      
      console.log('Test login result:', { data, error })
      alert(`Login test: ${error ? 'FAILED - ' + error.message : 'SUCCESS'}`)
    } catch (err) {
      console.error('Login test error:', err)
      alert('Login test FAILED: ' + String(err))
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px', 
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          🔧 Production Debug Info
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={testLogin}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Login
          </button>
        </div>

        <pre style={{ 
          backgroundColor: '#f8f8f8', 
          padding: '15px', 
          borderRadius: '5px',
          overflow: 'auto',
          fontSize: '12px',
          border: '1px solid #ddd'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4f8', borderRadius: '5px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0070f3' }}>Expected Values for Production:</h3>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li><strong>hostname:</strong> app.movearoundtms.com</li>
            <li><strong>origin:</strong> https://app.movearoundtms.com</li>
            <li><strong>supabaseUrl:</strong> https://wqeidcatuwqtzwhvmqfr.supabase.co</li>
            <li><strong>hasSupabaseKey:</strong> true</li>
            <li><strong>nodeEnv:</strong> production</li>
          </ul>
        </div>
      </div>
    </div>
  )
}