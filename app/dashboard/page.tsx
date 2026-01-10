'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '../lib/supabase-provider'
import AdminManager from '../components/AdminManager'
import UserDropdown from '../components/UserDropdown'

export default function Dashboard() {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('� Dashboard: Login bypassed - direct access enabled')
        
        // Skip authentication - set default user for demo
        const mockUser = {
          id: 'demo-user-id',
          email: 'demo@movearoundtms.com',
          user_metadata: {
            full_name: 'Demo User'
          }
        }
        
        console.log('✅ Dashboard: Using demo user for direct access')
        setUser(mockUser)
        setIsAdmin(true) // Grant admin access for demo
        
        // Optional: Still try to get real session if available, but don't require it
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('✅ Real session found, using actual user:', session.user.email)
            setUser(session.user)
            
            // Check real admin status
            const adminRes = await fetch('/api/admin/status')
            const adminData = await adminRes.json()
            if (adminRes.ok) {
              setIsAdmin(adminData.isAdmin)
            }
          }
        } catch (sessionError) {
          console.log('Session check failed, using demo mode:', sessionError)
        }
        
      } catch (error) {
        console.error('💥 Dashboard setup error:', error)
        // Don't redirect on error - just use demo mode
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [supabase])

  const handleSignOut = async () => {
    // No sign out needed - just refresh the page since there's no authentication
    try {
      console.log('� Refreshing dashboard...')
      window.location.reload()
    } catch (error) {
      console.error('Refresh error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      padding: 0,
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Dashboard</h1>
      <p style={{ fontSize: 20, color: '#475569', marginBottom: 32 }}>
        {user?.email ? `Logged in as ${user.email}` : 'Transportation Management System'}
        {isAdmin && <span style={{ marginLeft: 12, color: '#a21caf', fontWeight: 600 }}>👑 Admin</span>}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 32,
        width: '100%',
        maxWidth: 1000,
        marginBottom: 40,
      }}>
        <div style={{ background: '#e0e7ef', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: '#2563eb', marginBottom: 12 }}>Fleet Overview</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dbeafe', borderRadius: 8, padding: 12 }}>
              <span style={{ color: '#1e293b' }}>Active Trucks:</span>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>24</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dcfce7', borderRadius: 8, padding: 12 }}>
              <span style={{ color: '#1e293b' }}>Available Drivers:</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>18</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef9c3', borderRadius: 8, padding: 12 }}>
              <span style={{ color: '#1e293b' }}>Active Routes:</span>
              <span style={{ color: '#eab308', fontWeight: 700 }}>12</span>
            </div>
          </div>
        </div>
        <div style={{ background: '#e0e7ef', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: '#059669', marginBottom: 12 }}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#dbeafe', borderLeft: '4px solid #2563eb', borderRadius: '0 8px 8px 0', padding: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2563eb' }}>New delivery scheduled</div>
              <div style={{ fontSize: 13, color: '#2563eb' }}>Route 101 - 2 minutes ago</div>
            </div>
            <div style={{ background: '#dcfce7', borderLeft: '4px solid #059669', borderRadius: '0 8px 8px 0', padding: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#059669' }}>Driver inspection complete</div>
              <div style={{ fontSize: 13, color: '#059669' }}>John Doe - 15 minutes ago</div>
            </div>
            <div style={{ background: '#fef9c3', borderLeft: '4px solid #eab308', borderRadius: '0 8px 8px 0', padding: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#eab308' }}>Maintenance reminder</div>
              <div style={{ fontSize: 13, color: '#eab308' }}>Truck #15 - 1 hour ago</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#e0e7ef', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: '#0ea5e9', marginBottom: 12 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <NavAction href="/dispatch" label="Schedule New Route" color="#2563eb" />
            <NavAction href="/drivers" label="Add New Driver" color="#059669" />
            <NavAction href="/payroll" label="Generate Report" color="#64748b" />
            <NavAction href="/file-manager" label="📁 File Manager" color="#0ea5e9" />
            {isAdmin && (
              <NavAction href="/admin" label="🛡️ Admin Dashboard" color="#dc2626" />
            )}
          </div>
        </div>
      </div>
      {/* Admin Management Section */}
      {isAdmin && (
        <div style={{ marginTop: 32, width: '100%', maxWidth: 1000 }}>
          <AdminManager />
        </div>
      )}
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  )
}

// Navigation Action Button for Dashboard Quick Actions
import Link from 'next/link';
function NavAction({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link href={href} style={{
      background: color,
      color: 'white',
      borderRadius: 8,
      padding: 12,
      fontWeight: 600,
      fontSize: 18,
      marginBottom: 6,
      border: 'none',
      cursor: 'pointer',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'block',
      transition: 'background 0.2s',
    }}>
      {label}
    </Link>
  );
}
