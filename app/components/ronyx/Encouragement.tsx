"use client";

import { useEffect, useState } from "react";

// Small rotating encouragement line for office staff. Keep it warm but professional —
// it appears at the top of staff workflow pages.
const QUOTES = [
  "Every cleared ticket is money in the bank — nice work. 💪",
  "One call at a time. You've got this.",
  "You're keeping the wheels turning for the whole team. 🚚",
  "Steady progress beats a perfect day. Keep going.",
  "Great catch keeping drivers compliant and safe.",
  "Small fixes today save big headaches tomorrow.",
  "You make the hard stuff look easy. Thank you.",
  "Each item you close is one less thing holding up a paycheck.",
  "Focused and consistent — that's how the office wins.",
  "Sylvia & Tabitha: the backbone of the operation. 👏",
  "Done is better than perfect. Knock out the next one.",
  "Your attention to detail protects everyone's money.",
];

export default function Encouragement({ name }: { name?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    // pick a starting quote, then gently rotate every 45s
    setI(Math.floor(Math.random() * QUOTES.length));
    const t = setInterval(() => setI(p => (p + 1) % QUOTES.length), 45000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)", border: "1px solid #d1fae5", borderRadius: 10, padding: "9px 14px", marginBottom: 14 }}>
      <span style={{ fontSize: "1rem" }}>🌟</span>
      <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f766e" }}>{name ? `${name}, ` : ""}{QUOTES[i]}</span>
    </div>
  );
}
