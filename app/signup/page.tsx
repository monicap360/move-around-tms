"use client";

import { useMemo, useState } from "react";
import { useSupabase } from "../lib/supabase-provider";

export default function SignupPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Optional domain restrictions, comma-separated list (e.g., "ronyxlogistics.com,igotta.co")
  const allowedDomains = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS || "";
    return raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    // Enforce optional domain allowlist on client side
    if (allowedDomains.length > 0) {
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain || !allowedDomains.includes(domain)) {
        setLoading(false);
        setError(
          `Email domain not allowed. Allowed: ${allowedDomains.join(", ")}`
        );
        return;
      }
    }
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) setError(error.message);
    else {
      // If email confirmation is enabled, Supabase sends a verification email
      setMessage(
        "Account created! Check your email for a verification link, then log in to complete your profile."
      );
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-blue-100">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-1">Create Account</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Ronyx Logistics LLC
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          {allowedDomains.length > 0 && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-2">
              Signups are restricted to: {allowedDomains.join(", ")}
            </p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@ronyxlogistics.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          {message && <p className="text-green-700 text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? "Creating Account…" : "Sign Up"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          © 2025 Move Around TMS • All Rights Reserved
        </p>

        <div className="text-center mt-4">
          <a href="/login" className="text-sm text-blue-600 hover:underline">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </main>
  );
}
