"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import "../veronica/styles.css";

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

    const role = data.user?.user_metadata?.role;
    const userEmail = data.user?.email;

    if (userEmail === "melidazvl@outlook.com" || role === "manager") {
      router.push("/veronica");
    } else if (role === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/home");
    }
  }

  if (demoMode) {
    return (
      <div className="ronyx-login">
        <div className="login-box">
          <Image
            src="/ronyx_logo.svg"
            alt="ROnyx Logo"
            width={160}
            height={60}
            className="ronyx-logo"
          />
          <h2>ROnyx Fleet Portal</h2>
          <p className="login-tagline">Logins are disabled for demos.</p>
          <div className="space-y-3">
            <Link href="/veronica">Go to ROnyx Portal</Link>
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
        <Image
          src="/ronyx_logo.svg"
          alt="ROnyx Logo"
          width={160}
          height={60}
          className="ronyx-logo"
        />
        <h2>Welcome to ROnyx Fleet Portal</h2>
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
      </div>
    </div>
  );
}
