"use client";

import { useAuth } from "../contexts/AuthContext";

export default function DebugAuthPage() {
  const { user, session, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">Loading State</h3>
            <p className={loading ? "text-yellow-600" : "text-green-600"}>
              {loading ? "⏳ Loading..." : "✅ Loaded"}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">User State</h3>
            {user ? (
              <div className="text-green-600">
                <p>✅ User authenticated</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {user.created_at}</p>
              </div>
            ) : (
              <p className="text-red-600">❌ No user</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">Session State</h3>
            {session ? (
              <div className="text-green-600">
                <p>✅ Session active</p>
                <p><strong>Expires:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</p>
                <p><strong>Token Type:</strong> {session.token_type}</p>
              </div>
            ) : (
              <p className="text-red-600">❌ No session</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">Environment</h3>
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set"}</p>
            <p><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}</p>
          </div>

          <div className="mt-6">
            <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Login
            </a>
            <a href="/" className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}