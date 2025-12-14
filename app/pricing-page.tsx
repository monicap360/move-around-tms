"use client";
import React, { useState } from "react";

export default function PricingPage() {
  const [weeklyPay, setWeeklyPay] = useState("");
  const weekly = Number(weeklyPay);
  const monthly = weekly ? weekly * 4.33 : 0;
  const lowPlan = 399;
  const highPlan = 1999;
  const minSavings = Math.round(monthly - highPlan);
  const maxSavings = Math.round(monthly - lowPlan);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f5f7fa', color: '#0A1C2C', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ padding: '80px 20px', maxWidth: 1200, margin: 'auto', textAlign: 'center' }}>
        <h1 style={{ fontWeight: 800 }}>Simple Plans. Real Savings.</h1>
        <p style={{ fontSize: 18 }}>
          MoveAround TMS replaces your $4,000–$6,000/month ticket clerk — for a fraction of the cost.
        </p>
      </div>

      {/* PRICING GRID */}
      <div style={{ padding: '80px 20px', maxWidth: 1200, margin: 'auto', display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* C+ TIER */}
        <div style={tierStyle}>
          <h2 style={{ fontWeight: 800 }}>C+ Tier</h2>
          <p><strong>$399 / month</strong></p>
          <p>Setup Fee: <strong>$2,499</strong></p>
          <ul>
            <li>Basic OCR</li>
            <li>Basic payroll</li>
            <li>1–7 trucks</li>
          </ul>
          <div style={paymentPlanStyle}>
            <strong>Payment Plan:</strong><br />
            3 payments of <b>$833</b>
          </div>
          <a href="#" style={btnStyle}>Start Demo</a>
        </div>
        {/* PRO+ TIER */}
        <div style={{ ...tierStyle, borderColor: '#F97316', boxShadow: '0 6px 25px rgba(249,115,22,0.4)' }}>
          <h2 style={{ fontWeight: 800 }}>PRO+ (Most Popular)</h2>
          <p><strong>$699 / month</strong></p>
          <p>Setup Fee: <strong>$3,999</strong></p>
          <ul>
            <li>Advanced OCR</li>
            <li>Reconciliation Lite</li>
            <li>HR expiry tracking</li>
            <li>8–25 trucks</li>
          </ul>
          <div style={paymentPlanStyle}>
            <strong>Payment Plan:</strong><br />
            3 × $1,333<br />or<br />6 × $666
          </div>
          <a href="#" style={btnStyle}>Launch Sandbox</a>
        </div>
        {/* ENTERPRISE TIER */}
        <div style={tierStyle}>
          <h2 style={{ fontWeight: 800 }}>Enterprise</h2>
          <p><strong>$1,999 / month</strong></p>
          <p>Setup Fee: <strong>$6,999</strong></p>
          <ul>
            <li>Full Reconciliation Suite</li>
            <li>CSV + Excel matching</li>
            <li>Multi-org dashboard</li>
            <li>26–100 trucks</li>
          </ul>
          <div style={paymentPlanStyle}>
            <strong>Payment Plan:</strong><br />
            3 × $2,333<br />or<br />6 × $1,166
          </div>
          <a href="#" style={btnStyle}>Book Enterprise Demo</a>
        </div>
      </div>

      {/* SAVINGS CALCULATOR */}
      <div style={{ padding: '80px 20px', maxWidth: 1200, margin: 'auto' }}>
        <div style={calculatorBoxStyle}>
          <h2 style={{ fontWeight: 800 }}>How Much Will You Save?</h2>
          <p>Enter the weekly pay for your ticket clerk:</p>
          <input
            type="number"
            placeholder="Enter weekly pay (ex: 900)"
            value={weeklyPay}
            onChange={e => setWeeklyPay(e.target.value)}
            style={inputStyle}
          />
          <div style={savingsResultStyle}>
            {weekly
              ? <span>
                  You currently spend <strong>${Math.round(monthly)}/mo</strong><br />
                  on manual ticket entry.<br /><br />
                  With MoveAround TMS, you save between <strong>${minSavings}–${maxSavings} per month</strong>.
                </span>
              : "Your savings will appear here."
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles as JS objects
const tierStyle = {
  background: 'white',
  borderRadius: 10,
  padding: 40,
  border: '2px solid #0A1C2C',
  boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
};
const btnStyle = {
  padding: '14px 28px',
  display: 'inline-block',
  background: '#F97316',
  color: 'white',
  fontWeight: 700,
  borderRadius: 8,
  textDecoration: 'none',
  marginTop: 20,
};
const paymentPlanStyle = {
  background: '#34506A',
  color: 'white',
  padding: 20,
  borderRadius: 10,
  marginTop: 20,
};
const calculatorBoxStyle = {
  background: 'white',
  padding: 40,
  borderRadius: 10,
  boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  marginTop: 50,
};
const inputStyle = {
  padding: 12,
  width: '100%',
  fontSize: 18,
  margin: '12px 0',
  border: '2px solid #0A1C2C',
  borderRadius: 8,
};
const savingsResultStyle = {
  fontSize: 26,
  fontWeight: 800,
  color: '#F97316',
  marginTop: 20,
};
