"use client";
import React from "react";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f5f7fa', color: '#0A1C2C' }}>
      {/* HERO SECTION */}
      <div
        style={{
          background: `linear-gradient(rgba(10,28,44,0.8), rgba(10,28,44,0.4)), url('https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1500&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '140px 20px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 20 }}>MoveAround TMS™</h1>
        <p style={{ fontSize: 20, maxWidth: 700, margin: 'auto' }}>
          The only Texas-built TMS that automates ticket entry, reconciliation, payroll, and dispatch — replacing your $4k–$6k/mo ticket clerk.
        </p>
        <div>
          <a href="#" style={{ padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', margin: 12, background: '#F97316', color: 'white' }}>Try Free Demo</a>
          <a href="#" style={{ padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', margin: 12, border: '2px solid #fff', color: '#fff' }}>See Pricing</a>
        </div>
      </div>

      {/* REPLACE TICKET CLERK SECTION */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: 'auto' }}>
        <div style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80"
            style={{ width: '100%', borderRadius: 12 }}
            alt="Replace Ticket Clerk"
          />
          <div>
            <h2>Replace Your Ticket Clerk</h2>
            <p style={{ fontSize: 18 }}>
              Most trucking companies pay <b>$3,500–$5,500 every month</b> for someone to manually type tickets,
              fix Excel sheets, fight CSV mismatches, and calculate payroll.
            </p>
            <p style={{ fontWeight: 700 }}>
              MoveAround TMS automates everything — for $399–$1,999/month.
            </p>
            <a href="#" style={{ padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', margin: 12, background: '#F97316', color: 'white' }}>Calculate My Savings</a>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 40 }}>Everything Your Office Does — Automated</h2>
        <div style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div style={cardStyle}>
            <h3>🖨 OCR Ticket Scanning</h3>
            <p>Reads tons, yards, pits, trucks, times — instantly.</p>
          </div>
          <div style={cardStyle}>
            <h3>🔄 Reconciliation Engine</h3>
            <p>Matches OCR → CSV → Excel with 99% accuracy.</p>
          </div>
          <div style={cardStyle}>
            <h3>💵 Payroll Engine</h3>
            <p>Ton | Yard | Hour | Load | % | Truck capacity pay.</p>
          </div>
          <div style={cardStyle}>
            <h3>📁 HR Compliance</h3>
            <p>Auto alerts for CDL, med cards, insurance.</p>
          </div>
          <div style={cardStyle}>
            <h3>📦 Dispatch Board</h3>
            <p>Assign loads and track status in real-time.</p>
          </div>
          <div style={cardStyle}>
            <h3>🛠 Self-Onboarding</h3>
            <p>Let fleets configure their own system before paying.</p>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 40 }}>Simple Plans. Real Savings.</h2>
        <div style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* C+ */}
          <div style={pricingBoxStyle}>
            <h3>C+ Tier</h3>
            <p><strong>$399/mo</strong></p>
            <p>$2,499 setup fee</p>
            <ul>
              <li>Basic OCR</li>
              <li>Basic payroll</li>
              <li>1–7 trucks</li>
            </ul>
            <a href="#" style={orangeBtnStyle}>Start Demo</a>
          </div>
          {/* PRO+ */}
          <div style={{ ...pricingBoxStyle, borderColor: '#F97316' }}>
            <h3>PRO+ (Most Popular)</h3>
            <p><strong>$699/mo</strong></p>
            <p>$3,999 setup fee</p>
            <ul>
              <li>Advanced OCR</li>
              <li>Reconciliation Lite</li>
              <li>HR expiry tracking</li>
              <li>8–25 trucks</li>
            </ul>
            <a href="#" style={orangeBtnStyle}>Launch Sandbox</a>
          </div>
          {/* Enterprise */}
          <div style={pricingBoxStyle}>
            <h3>Enterprise</h3>
            <p><strong>$1,999/mo</strong></p>
            <p>$6,999 setup fee</p>
            <ul>
              <li>Full Reconciliation Suite</li>
              <li>CSV + Excel matching</li>
              <li>Multi-org dashboard</li>
              <li>26–100 trucks</li>
            </ul>
            <a href="#" style={orangeBtnStyle}>Book Enterprise Demo</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ background: '#0A1C2C', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <h2>Ready to eliminate manual ticket entry forever?</h2>
        <a href="#" style={{ padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, display: 'inline-block', margin: 12, background: '#F97316', color: 'white' }}>Try Free Demo</a>
      </div>
    </div>
  );
}

// Styles as JS objects for reuse
const cardStyle = {
  background: 'white',
  padding: 30,
  borderRadius: 10,
  boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
};

const pricingBoxStyle = {
  border: '2px solid #0A1C2C',
  borderRadius: 12,
  padding: 30,
  background: 'white',
};

const orangeBtnStyle = {
  padding: '14px 32px',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: 600,
  display: 'inline-block',
  margin: 12,
  background: '#F97316',
  color: 'white',
};
