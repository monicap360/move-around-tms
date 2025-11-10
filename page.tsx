export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-10">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ MoveAround TMS is Live
      </h1>
      <p className="text-gray-700 text-lg">
        Your static site build is working perfectly on SiteGround!
      </p>
      <p className="text-gray-500 mt-2">
        Next.js + Supabase + Monica 🚀
      </p>
    </main>
  );
}
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-10">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ MoveAround TMS is Live
      </h1>
      <p className="text-gray-700 text-lg">
        Your static site build is working perfectly on SiteGround!
      </p>
      <p className="text-gray-500 mt-2">
        Next.js + Supabase + Monica 🚀
      </p>
    </main>
  );
}
'use client'

// 🚨 NUCLEAR CACHE BUST - FORCE DASHBOARD ACCESS
console.log('🚨 AUTHENTICATION REMOVED - FORCING DASHBOARD ACCESS')

// Immediate redirect before React even renders
if (typeof window !== 'undefined') {
  const timestamp = Date.now()
  console.log('🔥 FORCE REDIRECT:', `/dashboard?v=${timestamp}`)
  window.location.replace(`/dashboard?nocache=${timestamp}`)
}

export default function HomePage() {
  // Multiple redirect attempts to bypass ALL caching
  if (typeof window !== 'undefined') {
    // Immediate
    window.location.replace('/dashboard?force=' + Math.random())
    
    // Delayed backup
    setTimeout(() => {
      window.location.replace('/dashboard')
    }, 50)
    
    // Meta refresh backup
    document.head.innerHTML += '<meta http-equiv="refresh" content="0; url=/dashboard">'
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#dc2626',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontSize: '24px'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
        🚨 NO LOGIN SYSTEM
      </h1>
      <h2>AUTHENTICATION COMPLETELY REMOVED</h2>
      <p style={{ marginTop: '20px' }}>Forcing redirect to dashboard...</p>
      <button 
        onClick={() => window.location.replace('/dashboard')}
        style={{
          padding: '20px 40px',
          fontSize: '24px',
          backgroundColor: 'white',
          color: '#dc2626',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          marginTop: '30px',
          fontWeight: 'bold'
        }}
      >
        🚀 MANUAL DASHBOARD ACCESS
      </button>
    </div>
  )
}
