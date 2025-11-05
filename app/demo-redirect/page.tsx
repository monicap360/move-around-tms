"use client";

import { useEffect } from "react";

export default function DemoRedirect() {
  useEffect(() => {
    // In demo mode, redirect anyone who hits the root to the dashboard
    console.log("Demo mode: Redirecting to dashboard");
    window.location.href = "/";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Move Around TMS</h1>
        <p className="text-gray-600">Demo Mode - Redirecting to dashboard...</p>
      </div>
    </div>
  );
}