"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  async function handleAuth() {
    setLoading(true);
    setMessage("");

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        setMessage("Check your email for the confirmation link!");
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;

        await routeAfterLogin();
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function routeAfterLogin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (error) {
      setMessage("Profile not found. Contact admin.");
      return;
    }

    switch (profile.role) {
      case "super_admin":
        window.location.href = "/admin";
        break;
      case "partner":
        window.location.href = "/partners/dashboard";
        break;
      case "company_admin":
      case "staff":
        window.location.href = "/company/dashboard";
        break;
      default:
        window.location.href = "/dashboard";
    }
  }

  async function quickLogin(targetEmail: string) {
    setEmail(targetEmail);
    setMessage("Use your password or check email for magic link");
  }

  if (demoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900">MoveAround TMS</h1>
          <p className="text-gray-600">Logins are disabled for demos.</p>
          <div className="space-y-2">
            <Link className="text-blue-600 hover:text-blue-800" href="/demo">
              Open Sales Demo
            </Link>
            <br />
            <Link className="text-blue-600 hover:text-blue-800" href="/ronyx">
              Go to Ronyx Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚚 MoveAround TMS
          </h1>
          <p className="text-gray-600">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>

          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.includes("error") || message.includes("failed")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 mb-3 text-center">
              Quick Login (Testing):
            </p>
            <div className="space-y-2">
              <button
                onClick={() =>
                  quickLogin("cruisesfromgalveston.texas@gmail.com")
                }
                className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded border hover:bg-purple-100 text-sm"
              >
                👑 Monica Peña (Super Admin)
              </button>
              <button
                onClick={() => quickLogin("sylviaypena@yahoo.com")}
                className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded border hover:bg-green-100 text-sm"
              >
                🤝 Sylvia Peña (Partner)
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Authorized users only • Role-based access system</p>
        </div>
      </div>
    </div>
  );
}
