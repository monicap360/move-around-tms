"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – CSS side-effect import, no type declarations needed
import "../veronica/styles.css";

export default function RonyxLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
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
