"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  issued_date: string;
  due_date: string;
  total_amount: number;
};

export default function RonyxBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void loadInvoices();
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

  async function generateInvoices() {
    setGenerating(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/ronyx/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_from_tickets" }),
      });
      const data = await res.json();
      if (data.invoices) {
        setInvoices((prev) => [...data.invoices, ...prev]);
        setStatusMessage("Invoices generated from approved tickets.");
      }
    } catch (err) {
      console.error("Failed to generate invoices", err);
      setStatusMessage("Invoice generation failed.");
    } finally {
      setGenerating(false);
      setTimeout(() => setStatusMessage(""), 3000);
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
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Billing Engine</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Generate invoices from approved tickets and track receivables.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="ronyx-action primary" onClick={generateInvoices} disabled={generating}>
              {generating ? "Generating..." : "Generate Invoices"}
            </button>
            <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{statusMessage}</span>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 6 }}>Ticket → Invoice Lifecycle</h2>
            <p style={{ color: "rgba(15,23,42,0.7)", fontSize: "0.9rem" }}>
              Approved tickets are batched into invoices automatically. When invoices are issued, AR tracking begins.
            </p>
          </div>
          {loading ? (
            <div className="ronyx-row">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="ronyx-row">No invoices yet. Generate from tickets to get started.</div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="ronyx-row" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{invoice.invoice_number}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    {invoice.customer_name} • Due {invoice.due_date || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>${Number(invoice.total_amount || 0).toFixed(2)}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{invoice.status}</div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
