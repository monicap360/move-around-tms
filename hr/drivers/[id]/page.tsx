
"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "../../../lib/adminToken";
import { ErrorBanner } from "../../../components/ErrorBanner";

export default function DriversAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      setError("Admin token missing or expired. Please re-enter your admin token.");
      return;
    }

    setToken(adminToken);
  }, []);

  if (error) return <ErrorBanner message={error} />;

  if (!token) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Drivers Admin</h1>
      {/* Rest of your admin page */}
    </div>
  );
}

