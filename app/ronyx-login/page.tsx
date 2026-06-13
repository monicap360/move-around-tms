"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – CSS side-effect import, no type declarations needed
import "../veronica/styles.css";

function EyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function RonyxLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("❌ " + signInError.message);
      return;
    }

    router.push("/ronyx");
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above, then click Forgot Password.");
      return;
    }
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  if (demoMode) {
    return (
      <div className="ronyx-login">
        <div className="login-box">
          <img src="/ronyx_logo.svg" alt="RONYX Logo" className="ronyx-logo" />
          <h2>RONYX Fleet Portal</h2>
          <p className="login-tagline">Logins are disabled for demos.</p>
          <div className="space-y-3">
            <Link href="/veronica">Go to RONYX Portal</Link>
            <br />
            <Link href="/demo">Open Sales Demo</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ronyx-login">
      <div className="login-box">
        <img src="/ronyx_logo.svg" alt="RONYX Logo" className="ronyx-logo" />
        <h2>Welcome to RONYX Fleet Portal</h2>
        <p className="login-tagline">Powered by Move Around TMS™</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        <div style={{ marginTop: 12, textAlign: "center" }}>
          {resetSent ? (
            <p style={{ color: "#00ff9d", fontSize: "0.85rem" }}>
              Password reset email sent — check your inbox.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              style={{
                background: "none",
                border: "none",
                color: "rgba(247,147,30,0.8)",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              {resetLoading ? "Sending..." : "Forgot password?"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
