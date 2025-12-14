export default function StyleTestInline() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '16px', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Style Test - Blue Background (Inline)</h1>
        <p style={{ margin: '0' }}>If you can see this with a blue background, basic styling is working</p>
      </div>
      
      {/* Main Layout */}
      <div style={{ display: 'flex', height: '500px' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '288px', 
          backgroundColor: '#1e3a8a', 
          color: 'white', 
          padding: '16px',
          borderRight: '1px solid #3b82f6'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Move Around TMS™
          </h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ 
              backgroundColor: '#1e40af', 
              padding: '12px', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Dashboard
            </div>
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1e40af'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Reports
            </div>
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1e40af'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Settings
            </div>
          </nav>
        </div>
        
        {/* Main Content */}
        <div style={{ 
          flex: 1, 
          backgroundColor: 'white', 
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Main Content Area (Inline Styles)
          </h2>
          <p style={{ color: '#374151', marginBottom: '16px' }}>
            This uses inline styles to ensure it works regardless of CSS loading:
          </p>
          <ul style={{ color: '#374151', paddingLeft: '20px' }}>
            <li>Blue sidebar with navigation</li>
            <li>White content area</li>
            <li>Proper layout structure</li>
            <li>Interactive hover effects</li>
          </ul>
        </div>
      </div>
    </div>
  )
}