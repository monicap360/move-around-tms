"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Listen for auth state change FIRST so we catch the event after code exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      } else if (event === "SIGNED_IN") {
        // Normal sign-in (email confirm, magic link) — send to dashboard
        setChecking(false);
        router.replace("/ronyx");
      }
    });

    // PKCE flow — Supabase puts the one-time code in ?code= query param
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setMessage("This reset link is invalid or has expired. Request a new one.");
        setStatus("error");
        setChecking(false);
      });
      // onAuthStateChange will fire PASSWORD_RECOVERY after exchange succeeds
      return () => subscription.unsubscribe();
    }

    // Implicit flow fallback — token in URL hash (older Supabase email templates)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
      setChecking(false);
      return () => subscription.unsubscribe();
    }

    // No code, no hash — shouldn't land here normally
    setChecking(false);
    router.replace("/ronyx-login");

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setMessage("Password updated! Redirecting to login...");
      await supabase.auth.signOut();
      setTimeout(() => router.replace("/ronyx-login"), 2000);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div style={outerStyle}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>
          Verifying reset link…
        </p>
      </div>
    );
  }

  // ── Error / non-recovery redirect state ───────────────────────────────────
  if (!isRecovery) {
    return (
      <div style={outerStyle}>
        {status === "error" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ff6b6b", fontFamily: "sans-serif", marginBottom: "1rem" }}>
              {message}
            </p>
            <a href="/ronyx-login" style={{ color: "#F7931E", fontFamily: "sans-serif" }}>
              Back to Login
            </a>
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>
            Redirecting…
          </p>
        )}
      </div>
    );
  }

  // ── Password update form ───────────────────────────────────────────────────
  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: "#F7931E", fontWeight: 700, marginBottom: "0.5rem", fontSize: "1.5rem" }}>
          Set New Password
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Enter your new password below.
        </p>

        <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            style={btnStyle}
          >
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: 12,
            fontSize: "0.85rem",
            color: status === "error" ? "#ff6b6b" : "#00ff9d",
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
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
