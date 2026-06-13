"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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

export default function AuthCallback() {
  const router = useRouter();
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoverySession, setRecoverySession] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      // PKCE flow: Supabase puts a one-time code in ?code=
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          setMessage("This reset link is invalid or has expired. Please request a new one.");
          setStatus("error");
          setChecking(false);
          return;
        }
        // Save tokens so we can re-apply the session right before updateUser
        setRecoverySession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        setIsRecovery(true);
        setChecking(false);
        return;
      }

      // Implicit flow fallback: token in URL hash
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        setIsRecovery(true);
        setChecking(false);
        return;
      }

      // Normal callback (email confirmation, magic link)
      const { data: { session } } = await supabase.auth.getSession();
      setChecking(false);
      if (session) {
        router.replace("/ronyx");
      } else {
        router.replace("/ronyx-login");
      }
    }

    handleCallback();
  }, [router]);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setStatus("error");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    setStatus("loading");

    if (!recoverySession) {
      setMessage("Reset link expired. Please request a new one.");
      setStatus("error");
      return;
    }

    // Call the Supabase REST API directly with the access token — avoids
    // client-side session persistence issues with @supabase/ssr cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${recoverySession.access_token}`,
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({ password }),
    });

    const json = await res.json();
    const error = res.ok ? null : json;

    if (error) {
      setMessage(json.msg || json.message || "Failed to update password. Please try again.");
      setStatus("error");
    } else {
      setStatus("success");
      setMessage("Password updated! Redirecting to login...");
      await supabase.auth.signOut();
      setTimeout(() => router.replace("/ronyx-login"), 2000);
    }
  }

  // Loading
  if (checking) {
    return (
      <div style={outerStyle}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>
          Verifying reset link…
        </p>
      </div>
    );
  }

  // Error / non-recovery
  if (!isRecovery) {
    return (
      <div style={outerStyle}>
        {status === "error" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ff6b6b", fontFamily: "sans-serif", marginBottom: "1rem" }}>{message}</p>
            <a href="/ronyx-login" style={{ color: "#F7931E", fontFamily: "sans-serif" }}>Back to Login</a>
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>Redirecting…</p>
        )}
      </div>
    );
  }

  // Password update form
  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: "#F7931E", fontWeight: 700, marginBottom: "0.5rem", fontSize: "1.5rem" }}>
          Set New Password
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Enter your new password below.
        </p>

        <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: "2.75rem", width: "100%", boxSizing: "border-box" }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: "2.75rem", width: "100%", boxSizing: "border-box" }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtnStyle} aria-label="Toggle confirm password visibility">
              {showConfirm ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>

          <button type="submit" disabled={status === "loading" || status === "success"} style={btnStyle}>
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: 12, fontSize: "0.85rem", color: status === "error" ? "#ff6b6b" : "#00ff9d" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const outerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
  fontFamily: "Poppins, sans-serif",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(30,30,30,0.9)",
  border: "1px solid rgba(247,147,30,0.3)",
  borderRadius: 16,
  padding: "2.5rem",
  width: "100%",
  maxWidth: 400,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#fff",
  fontSize: "0.9rem",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "#F7931E",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "0.625rem 1rem",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
  marginTop: 4,
};

const eyeBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  color: "rgba(255,255,255,0.45)",
  display: "flex",
  alignItems: "center",
};
