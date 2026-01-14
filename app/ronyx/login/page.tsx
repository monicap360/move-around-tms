"use client";

import Link from "next/link";

export default function RonyxLoginPage() {
  return (
    <div className="ronyx-login">
      <div className="login-box">
        <img src="/ronyx_logo.png" alt="Ronyx Logo" className="ronyx-logo" />
        <h2>Ronyx Fleet Portal</h2>
        <p className="login-tagline">Logins are disabled for demos.</p>
        <div className="space-y-3">
          <Link href="/ronyx">Go to Ronyx Portal</Link>
          <br />
          <Link href="/demo">Open Sales Demo</Link>
        </div>
      </div>
    </div>
  );
}
