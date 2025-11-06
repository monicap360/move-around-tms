"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../lib/supabase-provider";
import { signInWithProvider } from "../lib/auth";
import { Spinner } from "../components/ui/spinner";
import { LoadingOverlay } from "../components/ui/loading-overlay";

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  // ?? TEMPORARY: Check environment variables are loaded
  console.log("?? SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("?? SUPABASE_KEY_PRESENT:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGitHubLogin = async () => {
    setLoading(true);
    setErrorMessage("");
    
    try {
      console.log('🚀 Starting GitHub OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error('❌ OAuth initiation error:', error);
        setErrorMessage(`GitHub login failed: ${error.message}`);
        setLoading(false);
      } else {
        console.log('✅ OAuth initiated successfully');
        // The browser will redirect to GitHub, so we don't need to set loading to false
      }
    } catch (err) {
      console.error("💥 GitHub login error:", err);
      setErrorMessage("Failed to initiate GitHub login");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    console.log('Starting login process for:', email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response data:', data)
      console.log('Login response error:', error)

      if (error) {
        setErrorMessage(error.message)
        console.error('Login error:', error)
      } else if (data.user && data.session) {
        console.log('Login successful for user:', data.user.email)
        console.log('Session created:', data.session.access_token ? 'YES' : 'NO')
        
        // Force a page reload to trigger middleware
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } else {
        setErrorMessage('Login failed - no session created')
        console.error('Login issue: no user or session in response')
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred')
      console.error('Login exception:', err)
    } finally {
      setLoading(false)
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          minWidth: "300px",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Login to MoveAround TMS</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: "1rem", padding: "0.5rem" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: "1rem", padding: "0.5rem" }}
        />

        {errorMessage && (
          <p style={{ color: "red", textAlign: "center" }}>{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2"
          style={{
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            marginBottom: "1rem",
          }}
        >
          {loading ? (
            <>
              <Spinner size="sm" color="text-white" />
              <span>Signing in...</span>
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <div style={{ textAlign: "center", margin: "1rem 0", color: "#666" }}>
          or
        </div>

        <button
          type="button"
          onClick={() => {
            setEmail("test@movearoundtms.com");
            setPassword("TestPass123!");
            console.log("🧪 Test credentials set - now click Sign In");
          }}
          style={{
            backgroundColor: "#059669",
            color: "#fff",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            width: "100%",
            marginBottom: "0.5rem",
          }}
        >
          Use Test Credentials
        </button>

        <button
          type="button"
          onClick={handleGitHubLogin}
          disabled={loading}
          style={{
            backgroundColor: "#24292e",
            color: "#fff",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          Sign in with GitHub (Debug Mode)
        </button>
      </form>
      
      {/* Global loading overlay for authentication */}
      <LoadingOverlay show={loading} label="Authenticating..." />
    </div>
  );
}
