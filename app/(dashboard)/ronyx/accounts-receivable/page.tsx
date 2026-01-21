"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  payment_status?: string;
  issued_date?: string;
  due_date?: string;
  total_amount: number;
  paid_date?: string;
};

type AgingTotals = {
  current: number;
  "1-15": number;
  "16-30": number;
  "31-60": number;
  "60+": number;
};

function daysBetween(dateValue?: string) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getAgingBucket(dueDate?: string) {
  const daysPast = daysBetween(dueDate);
  if (daysPast <= 0) return "current";
  if (daysPast <= 15) return "1-15";
  if (daysPast <= 30) return "16-30";
  if (daysPast <= 60) return "31-60";
  return "60+";
}

export default function RonyxAccountsReceivablePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  async function markPaid(invoice: Invoice) {
    setSavingId(invoice.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/ronyx/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          status: "paid",
          payment_status: "paid",
          paid_date: today,
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

  const aging = useMemo(() => {
    return invoices.reduce<AgingTotals>(
      (acc, invoice) => {
        if (invoice.payment_status === "paid" || invoice.status === "paid") {
          return acc;
        }
        const bucket = getAgingBucket(invoice.due_date);
        acc[bucket] += Number(invoice.total_amount || 0);
        return acc;
      },
      { current: 0, "1-15": 0, "16-30": 0, "31-60": 0, "60+": 0 },
    );
  }, [invoices]);

  const outstandingTotal = Object.values(aging).reduce((sum, value) => sum + value, 0);

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
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Accounts Receivable</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>AR Overview</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Track outstanding balances and mark invoices as paid.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Outstanding Balance</h2>
            <div style={{ fontWeight: 700 }}>${outstandingTotal.toFixed(2)}</div>
          </div>
          <div className="ronyx-grid">
            {Object.entries(aging).map(([bucket, value]) => (
              <div key={bucket} className="ronyx-row" style={{ justifyContent: "space-between" }}>
                <span>{bucket} days</span>
                <span style={{ fontWeight: 700 }}>${value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Open Invoices</h2>
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
                    {invoice.customer_name} • Due {invoice.due_date || "—"} • {getAgingBucket(invoice.due_date)} days
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>${Number(invoice.total_amount || 0).toFixed(2)}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {invoice.payment_status || invoice.status}
                    </div>
                  </div>
                  <button
                    className="ronyx-action primary"
                    onClick={() => markPaid(invoice)}
                    disabled={savingId === invoice.id || invoice.payment_status === "paid" || invoice.status === "paid"}
                  >
                    {invoice.payment_status === "paid" || invoice.status === "paid" ? "Paid" : "Mark Paid"}
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
