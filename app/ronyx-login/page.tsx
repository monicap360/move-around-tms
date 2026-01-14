"use client";

import Link from "next/link";
import "../veronica/styles.css";

export default function RonyxLoginPage() {
  return (
    <div className="ronyx-login">
      <div className="login-box">
        <img src="/ronyx_logo.svg" alt="ROnyx Logo" className="ronyx-logo" />
        <h2>ROnyx Fleet Portal</h2>
        <p className="login-tagline">Logins are disabled for demos.</p>
        <div className="space-y-3">
          <Link href="/veronica">Go to ROnyx Portal</Link>
          <br />
          <Link href="/demo">Open Sales Demo</Link>
        </div>
      </div>
    </div>
  );
}
