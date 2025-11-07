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

    // Check user role and redirect accordingly
    const role = data.user?.user_metadata?.role;
    const userEmail = data.user?.email;
    
    // Special routing for Veronica (ROnyx manager)
    if (userEmail === "melidazvl@outlook.com" || role === "manager") {
      router.push("/veronica");
    } else if (role === "admin" || role === "super_admin") {
      router.push("/admin");
    } else if (role === "partner") {
      router.push("/partners/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="ronyx-login">
      <div className="login-box">
        <div className="logo-section">
          <img 
            src="/ronyx_logo.png" 
            alt="ROnyx Logo" 
            className="ronyx-logo"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="logo-fallback hidden">
            <div className="logo-text">ROnyx</div>
          </div>
        </div>
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
        
        <div className="login-footer">
          <p>ROnyx Fleet Management</p>
          <p className="copyright">© 2025 Move Around TMS™</p>
        </div>
      </div>
    </div>
  );
}