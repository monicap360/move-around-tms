"use client";

import { useState } from "react";
import { useSupabase } from "../lib/supabase-provider";

export default function AuthTestPage() {
  const { supabase } = useSupabase();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEmailLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("Testing email login with test credentials");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      console.log("Login result:", { data, error });
      setResult({
        type: "login",
        success: !error,
        data: data?.session ? "Session created" : "No session",
        error: error?.message,
      });

      // If successful, immediately check session
      if (data?.session) {
        const sessionCheck = await supabase.auth.getSession();
        console.log("Session check after login:", sessionCheck);
        setResult((prev: any) => ({
          ...prev,
          sessionCheck: sessionCheck.data?.session
            ? "Session confirmed"
            : "No session found",
        }));
      }
    } catch (err) {
      console.error("Login error:", err);
      setResult({ type: "login", success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const testGetSession = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("Testing get session");
      const { data, error } = await supabase.auth.getSession();

      console.log("Session result:", { data, error });
      setResult({
        type: "session",
        success: !error,
        data: data?.session
          ? `Session: ${data.session.user?.email}`
          : "No session",
        error: error?.message,
      });
    } catch (err) {
      console.error("Session error:", err);
      setResult({ type: "session", success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const testSignOut = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("Testing sign out");
      const { error } = await supabase.auth.signOut();

      console.log("Sign out result:", { error });
      setResult({
        type: "signout",
        success: !error,
        data: "Signed out successfully",
        error: error?.message,
      });
    } catch (err) {
      console.error("Sign out error:", err);
      setResult({ type: "signout", success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>

      <div className="space-y-4 mb-8">
        <button
          onClick={testEmailLogin}
          disabled={loading}
          className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Email Login (test@example.com)
        </button>

        <button
          onClick={testGetSession}
          disabled={loading}
          className="block w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Get Session
        </button>

        <button
          onClick={testSignOut}
          disabled={loading}
          className="block w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          Test Sign Out
        </button>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
          <p>Testing...</p>
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 border rounded">
          <h3 className="font-bold mb-2">
            Test Result ({result.type}):{" "}
            {result.success ? "✅ Success" : "❌ Failed"}
          </h3>
          {result.data && (
            <p>
              <strong>Data:</strong> {result.data}
            </p>
          )}
          {result.sessionCheck && (
            <p>
              <strong>Session Check:</strong> {result.sessionCheck}
            </p>
          )}
          {result.error && (
            <p className="text-red-600">
              <strong>Error:</strong> {result.error}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            First, try &quot;Test Get Session&quot; to see current auth state
          </li>
          <li>
            If not logged in, try &quot;Test Email Login&quot; (use actual
            credentials)
          </li>
          <li>Check browser console for detailed logs</li>
          <li>Verify middleware logs in terminal</li>
          <li>&quot;Test Sign Out&quot; to clear session</li>
        </ol>
      </div>
    </div>
  );
}
