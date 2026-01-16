"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function RonyxLandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>

      {/* Navigation */}
      <nav className="border-b border-[#F7931E] bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#F7931E] rounded-lg flex items-center justify-center font-bold text-black text-2xl">
                R
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-[#F7931E] tracking-tight">
                  RONYX LOGISTICS LLC
                </div>
                <div className="text-xs text-gray-400 tracking-wider">
                  Fleet Management Portal
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/ronyx/login"
                className="px-6 py-2.5 border border-[#F7931E] text-[#F7931E] font-semibold text-sm rounded hover:bg-[#F7931E] hover:text-black transition-all"
              >
                Portal Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-8 bg-gradient-to-br from-black via-black to-[#F7931E]/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F7931E]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#F7931E]/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-[1200px] mx-auto relative">
          <div
            className={`text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#F7931E]/30 bg-[#F7931E]/10 mb-8">
              <span className="w-2 h-2 bg-[#F7931E] rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-[#F7931E] tracking-widest uppercase">
                Fleet Management System
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-7xl font-extrabold mb-6 leading-tight">
              <span className="block text-white">Ronyx Logistics</span>
              <span className="block text-[#F7931E]">Command Center</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Real-time fleet tracking, driver management, and load optimization.
              Powered by Move Around TMS™ — built specifically for Ronyx operations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/ronyx/login"
                className="group px-10 py-5 bg-[#F7931E] text-black font-bold text-base rounded-lg hover:bg-[#ff8800] transition-all shadow-2xl shadow-[#F7931E]/30 flex items-center gap-3"
              >
                Access Portal
                <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="#features"
                className="px-10 py-5 border-2 border-[#F7931E]/30 text-white font-semibold text-base rounded-lg hover:border-[#F7931E] hover:bg-[#F7931E]/5 transition-all"
              >
                See Features
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto pt-16 border-t border-[#F7931E]/20">
              {[
                { value: "58", label: "Active Drivers", suffix: "" },
                { value: "42", label: "Trucks in Fleet", suffix: "" },
                { value: "98%", label: "On-Time Delivery", suffix: "" },
                { value: "24/7", label: "Live Tracking", suffix: "" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-5xl font-bold text-[#F7931E] mb-2">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-8 bg-black border-t border-[#F7931E]/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-[#F7931E] tracking-widest uppercase mb-4">
              YOUR OPERATIONS DASHBOARD
            </div>
            <h2 className="text-5xl font-bold text-white mb-6">
              Everything You Need to<br />Run Your Fleet
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Built for Ronyx drivers, dispatchers, and management.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🚚",
                title: "Live Fleet Tracking",
                desc: "Real-time location of every truck. ELD integration with Samsara and Motive.",
              },
              {
                icon: "👥",
                title: "Driver Management",
                desc: "Profiles, schedules, performance metrics, and compliance tracking.",
              },
              {
                icon: "📋",
                title: "Load Board",
                desc: "Assign loads, track status, and manage delivery schedules.",
              },
              {
                icon: "💰",
                title: "Automated Payroll",
                desc: "Driver pay calculations by load, hour, or mileage. Instant reports.",
              },
              {
                icon: "⏱️",
                title: "Detention Tracking",
                desc: "Automatic detention time tracking and claim generation.",
              },
              {
                icon: "📊",
                title: "Analytics & Reports",
                desc: "Revenue, fuel, performance, and compliance dashboards.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#F7931E]/5 border border-[#F7931E]/20 rounded-xl p-8 hover:border-[#F7931E]/50 hover:bg-[#F7931E]/10 transition-all group"
              >
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-24 px-8 bg-gradient-to-br from-[#F7931E]/10 to-black border-t border-[#F7931E]/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-[#F7931E] tracking-widest uppercase mb-4">
              QUICK ACCESS
            </div>
            <h2 className="text-5xl font-bold text-white mb-6">
              Your Ronyx Portal
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Link
              href="/ronyx/login"
              className="group bg-black/50 border-2 border-[#F7931E]/30 rounded-2xl p-10 hover:border-[#F7931E] hover:bg-[#F7931E]/5 transition-all"
            >
              <div className="text-5xl mb-6">👤</div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-[#F7931E] transition-colors">
                Driver Portal
              </h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                Access your loads, submit tickets, update status, and view your pay.
              </p>
              <div className="text-sm font-semibold text-[#F7931E] uppercase tracking-wider flex items-center gap-2">
                ACCESS NOW
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            <Link
              href="/ronyx/login"
              className="group bg-black/50 border-2 border-[#F7931E]/30 rounded-2xl p-10 hover:border-[#F7931E] hover:bg-[#F7931E]/5 transition-all"
            >
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-[#F7931E] transition-colors">
                Management Portal
              </h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                Full dashboard access, fleet analytics, driver management, and reports.
              </p>
              <div className="text-sm font-semibold text-[#F7931E] uppercase tracking-wider flex items-center gap-2">
                ACCESS NOW
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-8 bg-black border-t border-[#F7931E]/20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#F7931E]/10 to-transparent border border-[#F7931E]/30 rounded-3xl p-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="font-bold text-lg mb-2 text-white">Secure Access</h3>
                <p className="text-gray-400 text-sm">
                  Bank-level encryption
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="font-bold text-lg mb-2 text-white">Mobile Ready</h3>
                <p className="text-gray-400 text-sm">
                  Access from any device
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-bold text-lg mb-2 text-white">Real-Time Updates</h3>
                <p className="text-gray-400 text-sm">
                  Live data sync
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-gradient-to-br from-black to-[#F7931E]/10 border-t border-[#F7931E]/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-bold mb-6 text-white">
            Ready to Access<br />Your Ronyx Portal?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Login to manage your fleet, track loads, and optimize operations.
          </p>
          <Link
            href="/ronyx/login"
            className="inline-flex items-center gap-3 px-12 py-6 bg-[#F7931E] text-black font-bold text-base rounded-lg hover:bg-[#ff8800] transition-all shadow-2xl shadow-[#F7931E]/30"
          >
            <span>ACCESS PORTAL NOW</span>
            <span className="text-2xl">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F7931E]/20 bg-black py-12 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F7931E] rounded-lg flex items-center justify-center font-bold text-black text-xl">
                R
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white">
                  RONYX LOGISTICS LLC
                </span>
                <span className="text-xs text-gray-400">
                  Powered by Move Around TMS™
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <Link href="/ronyx/login" className="hover:text-[#F7931E] transition-colors">
                Portal Login
              </Link>
              <Link href="#features" className="hover:text-[#F7931E] transition-colors">
                Features
              </Link>
              <a href="mailto:support@movearoundtms.com" className="hover:text-[#F7931E] transition-colors">
                Support
              </a>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} Ronyx Logistics LLC
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
