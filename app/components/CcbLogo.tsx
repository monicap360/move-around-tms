"use client";

import { useId } from "react";

// Carrier Clearance Bureau™ brand marks, drawn as inline SVG so they render
// crisp at any size with no binary assets. Navy shield, steel-silver bevel,
// green "sentinel" clearance light. Matches the CCB app icon + clearance seal.

export function CcbShield({ size = 48 }: { size?: number }) {
  const u = useId().replace(/:/g, "");
  const steel = `st${u}`, navy = `nv${u}`, green = `gr${u}`, glow = `gl${u}`;
  return (
    <svg width={size * (100 / 112)} height={size} viewBox="0 0 100 112" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CCB">
      <defs>
        <linearGradient id={steel} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" /><stop offset="0.45" stopColor="#c2ccd8" /><stop offset="1" stopColor="#5f6b7a" />
        </linearGradient>
        <linearGradient id={navy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3559" /><stop offset="1" stopColor="#0a1428" />
        </linearGradient>
        <radialGradient id={green} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#f0fff2" /><stop offset="0.28" stopColor="#4ade80" /><stop offset="1" stopColor="#15803d" />
        </radialGradient>
        <filter id={glow} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      {/* shield — silver bevel then navy face */}
      <path d="M50 3 L94 19 V59 C94 84 74 100 50 108 C26 100 6 84 6 59 V19 Z" fill={`url(#${steel})`} />
      <path d="M50 9 L88 23 V59 C88 80 71 94 50 101 C29 94 12 80 12 59 V23 Z" fill={`url(#${navy})`} stroke="#0a1428" strokeWidth="0.5" />
      {/* road + dashed center line */}
      <path d="M50 20 L63 39 H37 Z" fill="#294c7d" opacity="0.75" />
      <line x1="50" y1="21" x2="50" y2="37" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* CCB wordmark */}
      <text x="50" y="67" textAnchor="middle" fontFamily="'Arial Black', Impact, sans-serif" fontWeight="900" fontSize="25" letterSpacing="-1" fill={`url(#${steel})`} stroke="#3f4a5a" strokeWidth="0.4">CCB</text>
      {/* green sentinel light */}
      <circle cx="50" cy="83" r="9.5" fill="#22c55e" opacity="0.4" filter={`url(#${glow})`} />
      <circle cx="50" cy="83" r="8" fill="#0a1428" stroke={`url(#${steel})`} strokeWidth="1.8" />
      <circle cx="50" cy="83" r="6.2" fill={`url(#${green})`} />
      <circle cx="48.4" cy="81.2" r="1.5" fill="#ffffff" opacity="0.92" />
    </svg>
  );
}

export function CcbSeal({ size = 120 }: { size?: number }) {
  const u = useId().replace(/:/g, "");
  const steel = `sst${u}`, navy = `snv${u}`, green = `sgr${u}`, glow = `sgl${u}`, top = `top${u}`, bot = `bot${u}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cleared to Move · Trusted to Deliver">
      <defs>
        <linearGradient id={steel} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" /><stop offset="0.5" stopColor="#b9c3d0" /><stop offset="1" stopColor="#5f6b7a" />
        </linearGradient>
        <radialGradient id={navy} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#1e3559" /><stop offset="1" stopColor="#0a1428" />
        </radialGradient>
        <radialGradient id={green} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#f0fff2" /><stop offset="0.3" stopColor="#4ade80" /><stop offset="1" stopColor="#166534" />
        </radialGradient>
        <filter id={glow} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" /></filter>
        <path id={top} d="M22 60 A38 38 0 0 0 98 60" />
        <path id={bot} d="M98 60 A38 38 0 0 1 22 60" />
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${steel})`} />
      <circle cx="60" cy="60" r="52" fill={`url(#${navy})`} />
      <circle cx="60" cy="60" r="51.5" fill="none" stroke="#0a1428" strokeWidth="1" />
      {/* curved text */}
      <text fill="#dbe4ef" fontFamily="'Arial Black', Impact, sans-serif" fontWeight="800" fontSize="9.5" letterSpacing="1.5">
        <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">CLEARED TO MOVE</textPath>
      </text>
      <text fill="#dbe4ef" fontFamily="'Arial Black', Impact, sans-serif" fontWeight="800" fontSize="9.5" letterSpacing="1.5">
        <textPath href={`#${bot}`} startOffset="50%" textAnchor="middle">TRUSTED TO DELIVER</textPath>
      </text>
      {/* side rivets */}
      <circle cx="20" cy="60" r="2" fill="#22c55e" /><circle cx="100" cy="60" r="2" fill="#22c55e" />
      {/* green sentinel core */}
      <circle cx="60" cy="60" r="24" fill="#22c55e" opacity="0.35" filter={`url(#${glow})`} />
      <circle cx="60" cy="60" r="20" fill="#0a1428" stroke={`url(#${steel})`} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="16" fill={`url(#${green})`} />
      <circle cx="55" cy="55" r="3.4" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

// Horizontal lockup: shield + wordmark. Use at the top of pages.
export function CcbLockup({ size = 40, dark = true }: { size?: number; dark?: boolean }) {
  const main = dark ? "#fff" : "#0a1428";
  const sub = dark ? "#8ea3c0" : "#5f6b7a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <CcbShield size={size} />
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontWeight: 900, fontSize: size * 0.4, color: main, letterSpacing: "0.01em" }}>Carrier Clearance Bureau<span style={{ fontSize: "0.6em", verticalAlign: "super" }}>™</span></div>
        <div style={{ fontWeight: 700, fontSize: size * 0.24, color: sub, letterSpacing: "0.16em", marginTop: 2 }}>CLEARED TO MOVE · TRUSTED TO DELIVER</div>
      </div>
    </div>
  );
}
