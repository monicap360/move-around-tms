"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  accounting_status?: string;
  accounting_exported_at?: string;
  accounting_reference?: string;
  total_amount: number;
};

type Integration = {
  id: string;
  name: string;
  category: string;
  status: string;
  enabled: boolean;
};

export default function RonyxAccountingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadInvoices(), loadIntegrations()]);
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/invoices");
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrations() {
    const res = await fetch("/api/ronyx/integrations");
    const data = await res.json();
    setIntegrations(data.integrations || []);
  }

  const accountingIntegrations = useMemo(
    () => integrations.filter((integration) => integration.category === "Accounting"),
    [integrations],
  );

  async function markExported(invoice: Invoice) {
    setSavingId(invoice.id);
    try {
      const res = await fetch("/api/ronyx/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          accounting_status: "exported",
          accounting_exported_at: new Date().toISOString(),
          accounting_reference: invoice.accounting_reference || `QB-${invoice.invoice_number}`,
        }),
      });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => prev.map((item) => (item.id === invoice.id ? data.invoice : item)));
      }
    } catch (err) {
      console.error("Failed to update invoice", err);
    } finally {
      setSavingId(null);
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
          max-width: 1200px;
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
          gap: 12px;
          flex-wrap: wrap;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
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
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #ffffff;
          border-color: transparent;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Accounting</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Accounting Export</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Sync invoices to accounting systems and track export status.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Accounting Connections</h2>
          {accountingIntegrations.length === 0 ? (
            <div className="ronyx-row">No accounting integrations configured.</div>
          ) : (
            accountingIntegrations.map((integration) => (
              <div key={integration.id} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{integration.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{integration.status}</div>
                </div>
                <span style={{ fontWeight: 700 }}>{integration.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            ))
          )}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Invoice Export Queue</h2>
          {loading ? (
            <div className="ronyx-row">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="ronyx-row">No invoices available.</div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="ronyx-row" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{invoice.invoice_number}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    {invoice.customer_name} • {invoice.accounting_status || "not_exported"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>${Number(invoice.total_amount || 0).toFixed(2)}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(15,23,42,0.6)" }}>
                      {invoice.accounting_reference || "Not exported"}
                    </div>
                  </div>
                  <button
                    className="ronyx-action primary"
                    onClick={() => markExported(invoice)}
                    disabled={savingId === invoice.id || invoice.accounting_status === "exported"}
                  >
                    {invoice.accounting_status === "exported" ? "Exported" : "Mark Exported"}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
