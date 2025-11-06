'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../lib/supabase-provider'

export default function OAuthDebug() {
  const { supabase } = useSupabase()
  const [debugInfo, setDebugInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const testGitHubOAuth = async () => {
    setLoading(true)
    setDebugInfo('Starting GitHub OAuth test...\n')
    
    try {
      // Log current URL and environment
      const currentUrl = window.location.href
      const origin = window.location.origin
      
      setDebugInfo(prev => prev + `Current URL: ${currentUrl}\n`)
      setDebugInfo(prev => prev + `Origin: ${origin}\n`)
      setDebugInfo(prev => prev + `Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n\n`)
      
      // Test OAuth initiation
      setDebugInfo(prev => prev + 'Calling supabase.auth.signInWithOAuth...\n')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${origin}/auth/callback`
        }
      })
      
      setDebugInfo(prev => prev + `OAuth Response:\n`)
      setDebugInfo(prev => prev + `- Data: ${JSON.stringify(data, null, 2)}\n`)
      setDebugInfo(prev => prev + `- Error: ${JSON.stringify(error, null, 2)}\n`)
      
      if (error) {
        setDebugInfo(prev => prev + `\n❌ OAuth Error: ${error.message}\n`)
      } else if (data?.url) {
        setDebugInfo(prev => prev + `\n✅ OAuth URL generated: ${data.url}\n`)
        setDebugInfo(prev => prev + `About to redirect to GitHub...\n`)
      } else {
        setDebugInfo(prev => prev + `\n⚠️ No URL or error returned\n`)
      }
      
    } catch (err) {
      setDebugInfo(prev => prev + `\n💥 Exception: ${err}\n`)
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    setDebugInfo(prev => prev + `\nCurrent Session Check:\n`)
    setDebugInfo(prev => prev + `- Session: ${session ? 'EXISTS' : 'NONE'}\n`)
    setDebugInfo(prev => prev + `- User: ${session?.user?.email || 'N/A'}\n`)
    setDebugInfo(prev => prev + `- Error: ${error ? error.message : 'NONE'}\n`)
  }

  useEffect(() => {
    checkCurrentSession()
  }, [])

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 GitHub OAuth Debug Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testGitHubOAuth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#24292e',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Testing...' : '🐙 Test GitHub OAuth'}
        </button>
        
        <button 
          onClick={checkCurrentSession}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔍 Check Session
        </button>
      </div>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        minHeight: '300px',
        border: '1px solid #ddd'
      }}>
        {debugInfo || 'Click "Test GitHub OAuth" to start debugging...'}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h3>What this tool does:</h3>
        <ul>
          <li>Tests the GitHub OAuth initiation process</li>
          <li>Shows the exact URL and parameters being used</li>
          <li>Reveals any errors before redirect</li>
          <li>Checks current session state</li>
        </ul>
        
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Test GitHub OAuth" and watch the debug output</li>
          <li>If it shows a URL, the OAuth setup is working</li>
          <li>If you see errors, we can fix the specific issue</li>
        </ol>
      </div>
    </div>
  )
}