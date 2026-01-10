'use client'

export default function TestPage() {
  const timestamp = new Date().toISOString()
  
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#1e40af', marginBottom: '20px' }}>
        🚀 AUTHENTICATION REMOVED - DIRECT ACCESS TEST
      </h1>
      
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        margin: '0 auto',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#059669' }}>✅ SUCCESS: No Login Required!</h2>
        <p>If you can see this page, authentication has been completely removed.</p>
        <p><strong>Generated at:</strong> {timestamp}</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            backgroundColor: '#059669',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '18px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🏠 Go to Dashboard
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#7c3aed',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Test
        </button>
      </div>

      <div style={{
        backgroundColor: '#fef3c7',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'left',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h3 style={{ color: '#92400e' }}>🔧 If You Still See Login Pages:</h3>
        <ul style={{ color: '#92400e' }}>
          <li><strong>Hard Refresh:</strong> Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
          <li><strong>Clear Cache:</strong> Go to browser settings and clear cache for movearoundtms.com</li>
          <li><strong>Try Incognito:</strong> Open an incognito/private window</li>
          <li><strong>Wait:</strong> Vercel deployment can take up to 3 minutes</li>
        </ul>
      </div>
    </div>
  )
}
