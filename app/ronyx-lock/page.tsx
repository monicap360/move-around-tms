"use client";

// Standalone lock page the middleware redirects to when there's no valid session.
// On a correct PIN the verify endpoint sets the HTTP-only session cookie; we then
// send the user on to where they were headed.

import { useEffect, useState } from "react";
import PinGate, { type ActiveStaff } from "@/app/components/ronyx/PinGate";

export default function RonyxLockPage() {
  const [next, setNext] = useState("/ronyx");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("next");
    if (p && p.startsWith("/") && !p.startsWith("//")) setNext(p);
  }, []);

  function onUnlock(s: ActiveStaff) {
    try {
      localStorage.setItem("ronyx_active_staff", JSON.stringify(s));
      localStorage.removeItem("ronyx_pin_skipped");
    } catch { /* ignore */ }
    window.location.href = next;
  }

  // On a locked (gated) site there is no "skip" — staff must enter a PIN.
  return <PinGate onUnlock={onUnlock} onSkip={() => { /* no bypass when the site is locked */ }} showSignupLinks />;
}
