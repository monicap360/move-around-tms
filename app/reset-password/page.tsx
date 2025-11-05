"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check if user came from a valid reset link
    checkSession();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setValidSession(true);
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    }
  };

  if (!validSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-blue-100">
          <h1 className="text-2xl font-bold text-center text-blue-700 mb-4">Invalid Reset Link</h1>
          <p className="text-center text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition text-center"
          >
            Back to Login
          </a>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-blue-100">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-green-700 mb-2">Password Reset Successful!</h1>
            <p className="text-gray-600 mb-4">Redirecting you to login...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-blue-100">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-1">Reset Password</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Enter your new password below
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>

          <div className="text-center">
            <a href="/login" className="text-sm text-gray-600 hover:underline">
              ← Back to Login
            </a>
          </div>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          © 2025 Move Around TMS • All Rights Reserved
        </p>
      </div>
    </main>
  );
}
