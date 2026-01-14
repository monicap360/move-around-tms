"use client";

import Link from "next/link";

export default function Callback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-4 p-8 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-xl font-bold text-gray-900">MoveAround TMS</h1>
        <p className="text-gray-600">Auth callbacks are disabled for demos.</p>
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
