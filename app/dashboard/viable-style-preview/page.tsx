"use client";

import React, { useState } from "react";

/* ==========  VIABLE TRUCKING DESIGN SYSTEM  ========== */

export default function ViableStylePreview() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      {/* Inject styles directly into the document */}
      <style jsx global>{`
        /* Button styles */
        .btn-primary {
          background-color: #1E40AF;
          color: #fff;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover { 
          background-color: #0F172A; 
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
        }

        .btn-secondary {
          background-color: #374151;
          color: #fff;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-secondary:hover { 
          background-color: #1E40AF;
          transform: translateY(-1px);
        }

        .btn-warning {
          background-color: #F97316;
          color: #fff;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-warning:hover { 
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .btn-outline {
          background-color: transparent;
          color: #1E40AF;
          font-weight: 600;
          border: 2px solid #1E40AF;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-outline:hover {
          background-color: #1E40AF;
          color: #fff;
        }

        /* Card styles */
        .card {
          background-color: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .card:hover {
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .card.dark {
          background-color: #0F172A;
          color: #F9FAFB;
          border-color: #374151;
        }
        .card.dark:hover {
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.3);
        }

        /* Status indicators */
        .status-active {
          background-color: #10B981;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .status-warning {
          background-color: #F59E0B;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .status-danger {
          background-color: #EF4444;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* Metric cards */
        .metric-card {
          background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
          color: white;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 15px rgba(30, 64, 175, 0.2);
        }

        /* Navigation tabs */
        .nav-tab {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          background-color: transparent;
          color: #6B7280;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .nav-tab.active {
          background-color: #1E40AF;
          color: white;
        }
        .nav-tab:hover:not(.active) {
          background-color: #F3F4F6;
          color: #1E40AF;
        }

        /* Google Fonts Import */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@300;400;500;600&family=Rajdhani:wght@500;600;700&display=swap');

        .font-heading { font-family: 'Poppins', sans-serif; }
        .font-body { font-family: 'Roboto', sans-serif; }
        .font-numeric { font-family: 'Rajdhani', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-[#F9FAFB] text-[#374151] font-body">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold text-[#1E40AF] tracking-tight">
                Viable Trucking
              </h1>
              <p className="text-[#9CA3AF] font-medium">
                Smart Logistics. Reliable Freight. Digital Control.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn-outline">Settings</button>
              <button className="btn-primary">New Shipment</button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-white border-b border-gray-200 px-6">
          <div className="max-w-7xl mx-auto flex space-x-1 py-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "fleet", label: "Fleet Management" },
              { id: "drivers", label: "Driver Portal" },
              { id: "shipments", label: "Shipments" },
              { id: "design", label: "Design System" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="metric-card">
                  <div className="font-numeric text-3xl font-bold">247</div>
                  <div className="text-blue-100 mt-1">Active Trucks</div>
                </div>
                <div className="metric-card" style={{background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)'}}>
                  <div className="font-numeric text-3xl font-bold">1,847</div>
                  <div className="text-orange-100 mt-1">Miles Today</div>
                </div>
                <div className="metric-card" style={{background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'}}>
                  <div className="font-numeric text-3xl font-bold">$127K</div>
                  <div className="text-green-100 mt-1">Revenue MTD</div>
                </div>
                <div className="metric-card" style={{background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'}}>
                  <div className="font-numeric text-3xl font-bold">98.2%</div>
                  <div className="text-purple-100 mt-1">On-Time Rate</div>
                </div>
              </div>

              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-heading font-semibold text-[#1E40AF]">
                      Driver Performance
                    </h3>
                    <span className="status-active">All Active</span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Real-time driver metrics, route tracking, and performance logs.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Speed</span>
                      <span className="font-numeric font-semibold">65 mph</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Fuel Efficiency</span>
                      <span className="font-numeric font-semibold">7.2 mpg</span>
                    </div>
                  </div>
                </div>

                <div className="card dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-heading font-semibold">Fleet Overview</h3>
                    <span className="status-warning">2 Alerts</span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Monitor fuel levels, maintenance schedules, and mileage reports.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Maintenance Due</span>
                      <span className="font-numeric font-semibold text-orange-400">3 Trucks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Fuel Level</span>
                      <span className="font-numeric font-semibold">74%</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-heading font-semibold text-[#1E40AF]">
                      Route Optimization
                    </h3>
                    <span className="status-active">Optimized</span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    AI-powered route planning saves 15% fuel costs daily.
                  </p>
                  <button className="btn-secondary w-full">View Routes</button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center py-8">
                <button className="btn-primary">Start Dispatch</button>
                <button className="btn-secondary">View Reports</button>
                <button className="btn-warning">Emergency Stop</button>
                <button className="btn-outline">Load Planning</button>
              </div>
            </div>
          )}

          {/* Fleet Tab */}
          {activeTab === "fleet" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold text-[#1E40AF]">Fleet Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-heading font-semibold mb-3">Truck Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Truck #247 - Peterbilt 579</span>
                      <span className="status-active">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Truck #134 - Kenworth T680</span>
                      <span className="status-warning">Maintenance</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Truck #089 - Freightliner</span>
                      <span className="status-active">Active</span>
                    </div>
                  </div>
                </div>
                <div className="card dark">
                  <h3 className="font-heading font-semibold mb-3">Maintenance Schedule</h3>
                  <p className="text-gray-300">
                    Predictive maintenance alerts keep your fleet running efficiently.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Drivers Tab */}
          {activeTab === "drivers" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold text-[#1E40AF]">Driver Portal</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <h3 className="font-heading font-semibold mb-3">Driver Rankings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>John Martinez</span>
                      <span className="font-numeric text-green-600 font-bold">98.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sarah Chen</span>
                      <span className="font-numeric text-green-600 font-bold">97.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mike Rodriguez</span>
                      <span className="font-numeric text-blue-600 font-bold">95.8%</span>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="font-heading font-semibold mb-3">Hours of Service</h3>
                  <p className="text-gray-600">DOT compliance tracking for all drivers.</p>
                </div>
                <div className="card">
                  <h3 className="font-heading font-semibold mb-3">Safety Alerts</h3>
                  <p className="text-gray-600">Real-time safety monitoring and alerts.</p>
                </div>
              </div>
            </div>
          )}

          {/* Shipments Tab */}
          {activeTab === "shipments" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold text-[#1E40AF]">Active Shipments</h2>
              <div className="card">
                <h3 className="font-heading font-semibold mb-4">Shipment Tracking</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Load #TMS-2025-1147</span>
                      <span className="status-active">In Transit</span>
                    </div>
                    <p className="text-gray-600 text-sm">Phoenix, AZ → Denver, CO</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Load #TMS-2025-1148</span>
                      <span className="status-warning">Loading</span>
                    </div>
                    <p className="text-gray-600 text-sm">Los Angeles, CA → Dallas, TX</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Design System Tab */}
          {activeTab === "design" && (
            <div className="space-y-8">
              <h2 className="text-2xl font-heading font-bold text-[#1E40AF]">Design System</h2>
              
              {/* Typography */}
              <div className="card">
                <h3 className="text-xl font-heading font-semibold text-[#1E40AF] mb-4">Typography</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-3xl font-heading font-bold text-[#1E40AF]">
                      Heading Font — Poppins
                    </h4>
                    <p className="text-gray-600">Used for titles, headings, and navigation</p>
                  </div>
                  <div>
                    <p className="font-body text-[#374151] text-lg">
                      Body Font — Roboto | Reliable, clear, and professional for dashboards.
                    </p>
                  </div>
                  <div>
                    <p className="font-numeric text-[#F97316] tracking-widest text-2xl font-bold">
                      Numeric Font — Rajdhani 600
                    </p>
                    <p className="text-gray-600">Used for metrics, numbers, and data displays</p>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div className="card">
                <h3 className="text-xl font-heading font-semibold text-[#1E40AF] mb-4">Color Palette</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { name: "Viable Blue", color: "#1E40AF", usage: "Primary brand, CTAs" },
                    { name: "Safety Orange", color: "#F97316", usage: "Alerts, warnings" },
                    { name: "Asphalt Gray", color: "#374151", usage: "Text, secondary buttons" },
                    { name: "Fleet Silver", color: "#9CA3AF", usage: "Subtle text, borders" },
                    { name: "Highway White", color: "#F9FAFB", usage: "Backgrounds, cards" },
                    { name: "Deep Black", color: "#0F172A", usage: "Dark mode, emphasis" },
                  ].map((swatch) => (
                    <div key={swatch.name} className="text-center">
                      <div
                        className="w-full h-20 rounded-lg shadow-sm border mb-2"
                        style={{ backgroundColor: swatch.color }}
                      />
                      <p className="text-sm font-medium">{swatch.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{swatch.color}</p>
                      <p className="text-xs text-gray-600 mt-1">{swatch.usage}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Button Examples */}
              <div className="card">
                <h3 className="text-xl font-heading font-semibold text-[#1E40AF] mb-4">Button Styles</h3>
                <div className="flex flex-wrap gap-4">
                  <button className="btn-primary">Primary Button</button>
                  <button className="btn-secondary">Secondary Button</button>
                  <button className="btn-warning">Warning Button</button>
                  <button className="btn-outline">Outline Button</button>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="card">
                <h3 className="text-xl font-heading font-semibold text-[#1E40AF] mb-4">Status Indicators</h3>
                <div className="flex flex-wrap gap-4">
                  <span className="status-active">Active</span>
                  <span className="status-warning">Warning</span>
                  <span className="status-danger">Critical</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

/* ==========  TAILWIND CONFIG EXTENSION  ========== */
/*
Add this to your tailwind.config.js:

theme: {
  extend: {
    colors: {
      viable: {
        blue: "#1E40AF",
        orange: "#F97316",
        gray: "#374151",
        silver: "#9CA3AF",
        black: "#0F172A",
        white: "#F9FAFB",
      },
    },
    fontFamily: {
      heading: ["Poppins", "sans-serif"],
      body: ["Roboto", "sans-serif"],
      numeric: ["Rajdhani", "sans-serif"],
    },
  },
},
*/

/* ==========  USAGE INSTRUCTIONS  ========== */
/*
1. Save this file as: app/dashboard/viable-style-preview/page.tsx
2. Run your dev server: npm run dev
3. Visit: http://localhost:3000/dashboard/viable-style-preview
4. Navigate through tabs to see different design elements
5. Copy styles to your globals.css or components as needed
*/