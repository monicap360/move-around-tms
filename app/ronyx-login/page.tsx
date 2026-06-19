"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Login temporarily bypassed — auto-redirect to dashboard
export default function RonyxLoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/ronyx"); }, [router]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#020817", color: "#94a3b8", fontFamily: "Inter, sans-serif", fontSize: "0.9rem" }}>
      Redirecting to dashboard...
    </div>
  );
}
