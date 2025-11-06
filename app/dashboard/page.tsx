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
    <div className="page-container">
      <div className="page-header">
        <div className="card-professional">
          <div className="card-header-professional">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="page-title">
                  Welcome to Move Around TMS
                </h1>
                <p className="page-subtitle">
                  {user?.email ? `Logged in as ${user.email}` : 'Transportation Management System'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <span className="badge-warning">
                    👑 Admin
                  </span>
                )}
                <span className={`text-sm ${user?.email_confirmed_at ? 'badge-success' : 'badge-warning'}`}>
                  {user?.email_confirmed_at ? '✅ Verified' : '⚠️ Email not verified'}
                </span>
                <UserDropdown 
                  user={user} 
                  isAdmin={isAdmin} 
                  onSignOut={handleSignOut} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-responsive">
        <div className="card-professional">
          <div className="card-header-professional">
            <h2 className="card-title-professional">Fleet Overview</h2>
          </div>
          <div className="card-content-professional">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                <span className="text-gray-700">Active Trucks:</span>
                <span className="badge-info font-bold">24</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                <span className="text-gray-700">Available Drivers:</span>
                <span className="badge-success font-bold">18</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                <span className="text-gray-700">Active Routes:</span>
                <span className="badge-warning font-bold">12</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-professional">
          <div className="card-header-professional">
            <h2 className="card-title-professional">Recent Activity</h2>
          </div>
          <div className="card-content-professional">
            <div className="space-y-3">
              <div className="p-3 border-l-4 border-blue-400 bg-blue-50 rounded-r-md">
                <div className="text-sm font-medium text-blue-900">New delivery scheduled</div>
                <div className="text-xs text-blue-700">Route 101 - 2 minutes ago</div>
              </div>
              <div className="p-3 border-l-4 border-green-400 bg-green-50 rounded-r-md">
                <div className="text-sm font-medium text-green-900">Driver inspection complete</div>
                <div className="text-xs text-green-700">John Doe - 15 minutes ago</div>
              </div>
              <div className="p-3 border-l-4 border-yellow-400 bg-yellow-50 rounded-r-md">
                <div className="text-sm font-medium text-yellow-900">Maintenance reminder</div>
                <div className="text-xs text-yellow-700">Truck #15 - 1 hour ago</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-professional">
          <div className="card-header-professional">
            <h2 className="card-title-professional">Quick Actions</h2>
          </div>
          <div className="card-content-professional">
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center">
                Schedule New Route
              </button>
              <button className="btn-success w-full justify-center">
                Add New Driver
              </button>
              <button className="btn-secondary w-full justify-center">
                Generate Report
              </button>
              <button 
                onClick={() => window.location.href = '/file-manager'}
                className="btn-secondary w-full justify-center"
              >
                📁 File Manager
              </button>
              {isAdmin && (
                <button className="btn-danger w-full justify-center">
                  🛡️ Admin Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Management Section */}
      {isAdmin && (
        <div className="mt-8">
          <AdminManager />
        </div>
      )}
    </div>
  )
}
