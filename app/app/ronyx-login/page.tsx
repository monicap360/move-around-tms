"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import "../veronica/styles.css";

export default function RonyxLoginPage() {
  const [email, setEmail] = useState("");
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

    const role = data.user?.user_metadata?.role;
    const userEmail = data.user?.email;
    
    // Special routing for Veronica's ROnyx Fleet Management
    if (userEmail === "melidazvl@outlook.com" || role === "manager") {
      router.push("/veronica"); // ROnyx Manager Dashboard
    } else if (role === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/home");
    }
  }

  return (
    <div className="ronyx-login">
      <div className="login-box">
        <img src="/ronyx_logo.svg" alt="ROnyx Logo" className="ronyx-logo" />
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