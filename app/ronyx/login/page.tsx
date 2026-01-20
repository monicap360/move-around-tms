"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import "../styles.css";

export default function RonyxLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  async function handleLogin(e: any) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("❌ " + error.message);
      return;
    }

    router.push("/ronyx");
  }

  if (demoMode) {
    return (
      <div className="ronyx-login">
        <div className="login-box">
          <Image
            src="/ronyx_logo.png"
            alt="Ronyx Logo"
            width={160}
            height={60}
            className="ronyx-logo"
          />
          <h2>Ronyx Fleet Portal</h2>
          <p className="login-tagline">Logins are disabled for demos.</p>
          <div className="space-y-3">
            <Link href="/ronyx">Go to Ronyx Portal</Link>
            <Link href="/ronyx">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ronyx-login">
      <div className="login-box">
        <Image
          src="/ronyx_logo.png"
          alt="Ronyx Logo"
          width={160}
          height={60}
          className="ronyx-logo"
        />
        <h2>Welcome to Ronyx Fleet Portal</h2>
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
        <div className="space-y-3" style={{ marginTop: 12 }}>
          <Link href="/ronyx">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
