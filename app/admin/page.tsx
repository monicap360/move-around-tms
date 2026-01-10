'use client'

import { useState, useEffect } from 'react'
import { useRoleBasedAuth } from '../lib/role-auth'
import Link from 'next/link'

interface PartnerOverview {
  id: string
  name: string
  email: string
  companiesCount: number
  monthlyCommission: number
  theme: {
    primary: string
    brand: string
  }
  slug: string
}

interface SuperAdminStats {
  totalPartners: number
  totalCompanies: number
  totalDrivers: number
  monthlyRevenue: number
  pendingApprovals: number
  activeTickets: number
  totalUsers: number
  systemHealth: number
}

export default function SuperAdminDashboard() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth()
  const [stats, setStats] = useState<SuperAdminStats>({
    totalPartners: 0,
    totalCompanies: 0,
    totalDrivers: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    activeTickets: 0,
    totalUsers: 0,
    systemHealth: 98
  })
  
  const [partners, setPartners] = useState<PartnerOverview[]>([])
  const [selectedView, setSelectedView] = useState('admin')

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadSuperAdminData()
    }
  }, [profile])

  async function loadSuperAdminData() {
    // Mock data - replace with real Supabase queries
    setStats({
      totalPartners: 4,
      totalCompanies: 23,
      totalDrivers: 156,
      monthlyRevenue: 45750.00,
      pendingApprovals: 8,
      activeTickets: 42,
      totalUsers: 89,
      systemHealth: 98
    })

    setPartners([
      {
        id: '1',
        name: 'Veronica Butanda',
        email: 'melidazvl@outlook.com',
        companiesCount: 8,
        monthlyCommission: 1850.00,
        theme: {
          primary: '#C9A348',
          brand: 'RonYX Logistics LLC'
        },
        slug: 'ronyx'
      },
      {
        id: '2', 
        name: 'Maria Elizondo',
        email: 'melizondo@taxproms.com',
        companiesCount: 6,
        monthlyCommission: 1200.00,
        theme: {
          primary: '#2563eb',
          brand: 'Elite Transport Solutions'
        },
        slug: 'elite'
      },
      {
        id: '3',
        name: 'Anil Meighoo',
        email: 'anil.meighoo@gmail.com', 
        companiesCount: 4,
        monthlyCommission: 950.00,
        theme: {
          primary: '#16a34a',
          brand: 'Meighoo Logistics'
        },
        slug: 'meighoo'
      },
      {
        id: '4',
        name: 'Miram Garza',
        email: 'miram@pending.com',
        companiesCount: 5,
        monthlyCommission: 1100.00,
        theme: {
          primary: '#dc2626',
          brand: 'Garza Transport Group'
        },
        slug: 'garza'
      }
    ])
  }

  function handleViewSwitch(view: string) {
    setSelectedView(view)
    if (view === 'admin') {
      // Stay on current page
      return
    } else {
      // Navigate to partner dashboard or other sections
      if (view.startsWith('partner-')) {
        const partnerSlug = view.replace('partner-', '')
        window.location.href = `/partners/${partnerSlug}/dashboard`
      } else {
        window.location.href = `/${view}`
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!hasPermission('super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Super admin access required.</p>
        </div>
      </div>
    )
  }

  // Determine user greeting based on email
  const getUserTitle = (email: string) => {
    switch (email) {
      case 'cruisesfromgalveston.texas@gmail.com': return 'Monica! 🌟'
      case 'brecamario@gmail.com': return 'Breanna! 💫'  
      case 'shamsaalansari@hotmail.com': return 'Shamsa! ✨'
      case 'sylviaypena@yahoo.com': return 'Sylvia! 👑'
      default: return 'Admin!'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MoveAround TMS</h1>
                <p className="text-sm text-purple-600 font-medium">Super Admin Portal - Global Control</p>
              </div>
            </div>

            {/* View Switcher */}
            <div className="flex items-center space-x-4">
              <select 
                value={selectedView}
                onChange={(e) => handleViewSwitch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="admin">🎛️ System Admin Dashboard</option>
                <optgroup label="Partner Portals">
                  <option value="partner-ronyx">🟡 RonYX Dashboard (Veronica)</option>
                  <option value="partner-elite">🔵 Elite Transport (Maria)</option>
                  <option value="partner-meighoo">🟢 Meighoo Logistics (Anil)</option>
                  <option value="partner-garza">🔴 Garza Transport (Miram)</option>
                </optgroup>
                <optgroup label="System Sections">
                  <option value="hr">👥 HR Management</option>
                  <option value="payroll">💰 Payroll System</option>
                  <option value="analytics">📊 System Analytics</option>
                </optgroup>
              </select>
              
              <div className="text-right">
                <p className="font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-sm text-gray-600">Super Administrator</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
                {profile?.full_name?.[0].toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {getUserTitle(user?.email || '')}
          </h2>
          <p className="text-gray-600">
            Complete system control and partner oversight
          </p>
        </div>

        {/* Super Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SuperAdminStatCard
            title="Total Partners"
            value={stats.totalPartners}
            icon="🤝"
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <SuperAdminStatCard
            title="Total Companies"
            value={stats.totalCompanies}
            icon="🏢"
            color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          />
          <SuperAdminStatCard
            title="Active Users"
            value={stats.totalUsers}
            icon="👥"
            color="bg-gradient-to-r from-purple-500 to-purple-600"
          />
          <SuperAdminStatCard
            title="System Health"
            value={`${stats.systemHealth}%`}
            icon="💚"
            color="bg-gradient-to-r from-green-500 to-green-600"
          />
          <SuperAdminStatCard
            title="Active Drivers"
            value={stats.totalDrivers}
            icon="🚛"
            color="bg-gradient-to-r from-orange-500 to-orange-600"
          />
          <SuperAdminStatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon="💰"
            color="bg-gradient-to-r from-yellow-500 to-yellow-600"
          />
          <SuperAdminStatCard
            title="Active Tickets"
            value={stats.activeTickets}
            icon="🎫"
            color="bg-gradient-to-r from-red-500 to-red-600"
          />
          <SuperAdminStatCard
            title="Pending Items"
            value={stats.pendingApprovals}
            icon="⏳"
            color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          />
        </div>

        {/* Partner Management Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Partner Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {partners.map((partner) => (
              <PartnerManagementCard key={partner.id} partner={partner} />
            ))}
          </div>
        </div>

        {/* System Management */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SystemManagementCard
            title="User Management"
            description="Manage roles, permissions, and user accounts"
            icon="👥"
            link="/admin/users"
            color="bg-blue-50 border-blue-200"
            textColor="text-blue-800"
            buttonColor="bg-blue-600 hover:bg-blue-700"
          />
          <SystemManagementCard
            title="System Configuration"
            description="Configure system settings and integrations"
            icon="⚙️"
            link="/admin/settings"
            color="bg-purple-50 border-purple-200"
            textColor="text-purple-800"
            buttonColor="bg-purple-600 hover:bg-purple-700"
          />
          <SystemManagementCard
            title="Analytics & Reports"
            description="View system analytics and generate reports"
            icon="📈"
            link="/admin/analytics"
            color="bg-emerald-50 border-emerald-200"
            textColor="text-emerald-800"
            buttonColor="bg-emerald-600 hover:bg-emerald-700"
          />
        </div>
      </main>
    </div>
  )
}

function SuperAdminStatCard({ title, value, icon, color }: {
  title: string
  value: string | number
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function PartnerManagementCard({ partner }: { partner: PartnerOverview }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-gray-900">{partner.theme.brand}</h4>
          <p className="text-sm text-gray-600">{partner.name}</p>
        </div>
        <div 
          className="w-4 h-4 rounded-full shadow-inner"
          style={{ backgroundColor: partner.theme.primary }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xl font-bold text-gray-900">{partner.companiesCount}</p>
          <p className="text-xs text-gray-600">Companies</p>
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: partner.theme.primary }}>
            ${partner.monthlyCommission}
          </p>
          <p className="text-xs text-gray-600">Commission</p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => window.location.href = `/partners/${partner.slug}/dashboard`}
          className="flex-1 py-2 px-3 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: partner.theme.primary }}
        >
          View Portal
        </button>
        <button className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors">
          Manage
        </button>
      </div>
    </div>
  )
}

function SystemManagementCard({ title, description, icon, link, color, textColor, buttonColor }: {
  title: string
  description: string
  icon: string
  link: string
  color: string
  textColor: string
  buttonColor: string
}) {
  return (
    <div className={`p-6 rounded-xl border-2 ${color} hover:shadow-lg transition-all hover:scale-105`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h4 className={`font-bold text-lg ${textColor}`}>{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <Link 
        href={link}
        className={`inline-block w-full text-center py-2 px-4 rounded-lg text-white font-medium transition-colors ${buttonColor}`}
      >
        Access {title}
      </Link>
    </div>
  )
}
