"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Supabase puts the token in the URL hash for recovery links
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
      return;
    }

    // For other auth callbacks (email confirmation, magic link), just redirect
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/ronyx");
      } else {
        router.replace("/ronyx-login");
      }
    })();
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
      setTimeout(() => router.replace("/ronyx-login"), 2000);
    }
  }

  if (!isRecovery) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>Redirecting...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
      fontFamily: "Poppins, sans-serif",
      padding: "1rem",
    }}>
      <div style={{
        background: "rgba(30,30,30,0.9)",
        border: "1px solid rgba(247,147,30,0.3)",
        borderRadius: 16,
        padding: "2.5rem",
        width: "100%",
        maxWidth: 400,
      }}>
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
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#fff",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#fff",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            style={{
              background: "#F7931E",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "0.625rem 1rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            {status === "loading" ? "Updating..." : "Update Password"}
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
