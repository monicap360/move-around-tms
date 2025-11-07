"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import "../../veronica/styles.css";

export default function RonyxBrandedLoginPage() {
  const [email, setEmail] = useState("melidazvl@outlook.com"); // Pre-fill Veronica's email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    // Direct to ROnyx Manager Dashboard
    router.push("/veronica");
  }

  return (
    <div className="ronyx-login">
      <div className="login-box">
        <img src="/ronyx_logo.svg" alt="ROnyx Logo" className="ronyx-logo" />
        <h2>ROnyx Fleet Management</h2>
        <p className="login-tagline">Manager Portal • Powered by Move Around TMS™</p>

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
            {loading ? "Signing In..." : "Access Dashboard"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}
        
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>
          <p>ROnyx Fleet Management Portal</p>
          <p>Dedicated access for Veronica Butanda</p>
        </div>
      </div>
    </div>
  );
}