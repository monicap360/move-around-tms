'use client'


import { useState, useEffect, useMemo, useRef } from 'react'
import { useRoleBasedAuth } from '../../lib/role-auth'
import { exportNodeAsPng } from '../maintenance/dvir-dashboard/exportAsImage'
// Compliance analytics mock data generator (replace with Supabase query)
function generateComplianceTrends() {
  // 30 days of mock data
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - i));
    const compliant = Math.floor(Math.random() * 8 + 2);
    const noncompliant = Math.floor(Math.random() * 3);
    return {
      date: date.toISOString().slice(0, 10),
      compliant,
      noncompliant,
      total: compliant + noncompliant,
    };
  });
}

interface PartnerTheme {
  brand: string
  primary: string
  secondary: string
  background: string
  accent?: string
  text: {
    primary: string
    secondary: string
    light: string
  }
  logo: string
  tagline: string
  navigation: {
    background: string
    text: string
    hover: string
  }
  cards: {
    background: string
    border: string
    shadow: string
  }
  buttons: {
    primary: string
    primaryHover: string
    secondary: string
    secondaryHover: string
  }
}

interface DashboardStats {
  companiesOnboarded: number
  activeDrivers: number
  hrUploads: number
  monthlyCommission: number
  totalReferrals: number
  pendingApprovals: number
}

export default function PartnerDashboard() {
  const { user, profile, partnerInfo, loading } = useRoleBasedAuth()
  const [theme, setTheme] = useState<PartnerTheme | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    companiesOnboarded: 0,
    activeDrivers: 0,
    hrUploads: 0,
    monthlyCommission: 0,
    totalReferrals: 0,
    pendingApprovals: 0
  })

  // Compliance analytics state
  const [complianceTrends, setComplianceTrends] = useState([])
  const complianceSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (partnerInfo?.theme) {
      setTheme(partnerInfo.theme as PartnerTheme)
      loadPartnerStats()
      setComplianceTrends(generateComplianceTrends())
    } else if (profile?.role === 'partner') {
      // Load default RonYX theme for Veronica
      loadRonYXTheme()
      setComplianceTrends(generateComplianceTrends())
    }
  }, [partnerInfo, profile])

  async function loadRonYXTheme() {
    try {
      const response = await fetch('/partners/ronyx/theme.json')
      const themeData = await response.json()
      setTheme(themeData)
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }

  async function loadPartnerStats() {
    // Mock data for now - replace with real Supabase queries
    setStats({
      companiesOnboarded: 12,
      activeDrivers: 48,
      hrUploads: 156,
      monthlyCommission: 2850.00,
      totalReferrals: 15,
      pendingApprovals: 3
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your partner dashboard...</p>
        </div>
      </div>
    )
  }

  if (profile?.role !== 'partner') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">This dashboard is for partners only.</p>
        </div>
      </div>
    )
  }

  if (!theme) {
    return <div>Loading theme...</div>
  }

  const brandDisplay = theme.brand === "RonYX Logistics LLC" ? "RonYX" : theme.brand

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: theme.background,
        color: theme.text.primary
      }}
    >
      {/* Header */}
      <header 
        className="shadow-lg"
        style={{ backgroundColor: theme.navigation.background }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{ 
                    backgroundColor: theme.background,
                    color: theme.primary 
                  }}
                >
                  R
                </div>
                <div>
                  <h1 
                    className="text-2xl font-bold"
                    style={{ color: theme.navigation.text }}
                  >
                    {brandDisplay}
                  </h1>
                  <p 
                    className="text-sm opacity-90"
                    style={{ color: theme.navigation.text }}
                  >
                    {theme.tagline}
                  </p>
            {/* Compliance Analytics Section */}
            <div className="mb-8" ref={complianceSectionRef}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-lg" style={{ color: theme.text.primary }}>Compliance Analytics (30 days)</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                    onClick={() => {
                      const headers = ["Date","Compliant","Noncompliant","Total"];
                      const rows = complianceTrends.map((d: any) => [d.date, d.compliant, d.noncompliant, d.total]);
                      const csv = [headers, ...rows].map(r => r.map(x => `"${(x||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `compliance_analytics_${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >Export CSV</button>
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    onClick={() => {
                      if (complianceSectionRef.current) exportNodeAsPng(complianceSectionRef.current, `compliance_analytics_${new Date().toISOString().slice(0,10)}.png`);
                    }}
                  >Export as Image</button>
                </div>
              </div>
              <ComplianceCalendar data={complianceTrends} />
            </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p 
                  className="font-medium"
                  style={{ color: theme.navigation.text }}
                >
                  {partnerInfo?.full_name || profile?.full_name}
                </p>
                <p 
                  className="text-sm opacity-75"
                  style={{ color: theme.navigation.text }}
                >
                  Partner Dashboard
                </p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                style={{ 
                  backgroundColor: theme.background,
                  color: theme.primary 
                }}
              >
                {(partnerInfo?.full_name || profile?.full_name || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: theme.text.primary }}>
            Welcome back, {partnerInfo?.full_name?.split(' ')[0] || 'Partner'}!
          </h2>
          <p style={{ color: theme.text.secondary }}>
            Here's your partner performance overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Companies Onboarded"
            value={stats.companiesOnboarded}
            theme={theme}
            icon="🏢"
          />
          <StatCard
            title="Active Drivers"
            value={stats.activeDrivers}
            theme={theme}
            icon="👨‍💼"
          />
          <StatCard
            title="HR Uploads"
            value={stats.hrUploads}
            theme={theme}
            icon="📄"
          />
          <StatCard
            title="Monthly Commission"
            value={`$${stats.monthlyCommission.toFixed(2)}`}
            theme={theme}
            icon="💰"
          />
          <StatCard
            title="Total Referrals"
            value={stats.totalReferrals}
            theme={theme}
            icon="🤝"
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            theme={theme}
            icon="⏳"
          />
        </div>

        {/* Referral Tracker Section */}
        <div 
          className="rounded-lg p-6"
          style={{ 
            backgroundColor: theme.cards.background,
            border: `1px solid ${theme.cards.border}`,
            boxShadow: theme.cards.shadow
          }}
        >
          <h3 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Referral Tracker
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded border-l-4" style={{ borderLeftColor: theme.primary }}>
              <div>
                <h4 className="font-medium" style={{ color: theme.text.primary }}>ABC Transport Co.</h4>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Onboarded: Nov 1, 2025</p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: theme.primary }}>$250.00</p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Commission</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 rounded border-l-4" style={{ borderLeftColor: theme.primary }}>
              <div>
                <h4 className="font-medium" style={{ color: theme.text.primary }}>XYZ Logistics</h4>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Onboarded: Oct 28, 2025</p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: theme.primary }}>$180.00</p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Commission</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <button
            className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ 
              backgroundColor: theme.buttons.primary,
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.buttons.primaryHover}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = theme.buttons.primary}
          >
            Add New Company
          </button>
          <button
            className="px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: theme.buttons.secondary,
              color: theme.text.light
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.buttons.secondaryHover}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = theme.buttons.secondary}
          >
            View Reports
          </button>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, theme, icon }: { 
  title: string
  value: string | number
  theme: PartnerTheme
  icon: string 
}) {
  return (
    <div 
      className="rounded-lg p-6 transition-transform hover:scale-105"
      style={{ 
        backgroundColor: theme.cards.background,
        border: `1px solid ${theme.cards.border}`,
        boxShadow: theme.cards.shadow
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>
            {title}
          </p>
          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
            {value}
          </p>
        </div>
        <div className="text-3xl opacity-60">
          {icon}
        </div>
      </div>
    </div>
  )
}
