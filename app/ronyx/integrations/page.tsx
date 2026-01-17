"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Integration = {
  id: string;
  name: string;
  category: string;
  status: string;
  enabled: boolean;
};

export default function RonyxIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    void loadIntegrations();
  }, []);

  async function loadIntegrations() {
    const res = await fetch("/api/ronyx/integrations");
    const data = await res.json();
    setIntegrations(data.integrations || []);
  }

  async function toggleIntegration(integration: Integration) {
    const res = await fetch("/api/ronyx/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: integration.id, enabled: !integration.enabled }),
    });
    const data = await res.json();
    if (data.integration) {
      setIntegrations((prev) => prev.map((item) => (item.id === integration.id ? data.integration : item)));
    }
  }

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-toggle {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: #ffffff;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Integrations</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Connected Systems</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Connect accounting, telematics, scale house, and load boards.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card">
          {integrations.map((integration) => (
            <div key={integration.id} className="ronyx-row" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{integration.name}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                  {integration.category} • {integration.status}
                </div>
              </div>
              <button className="ronyx-toggle" onClick={() => toggleIntegration(integration)}>
                {integration.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
