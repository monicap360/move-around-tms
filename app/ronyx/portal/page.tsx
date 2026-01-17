"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Load = {
  id: string;
  load_number: string;
  route: string;
  status: string;
  customer_name: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
};

export default function RonyxPortalPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const [loadsRes, invoicesRes] = await Promise.all([fetch("/api/ronyx/loads"), fetch("/api/ronyx/invoices")]);
    const loadsData = await loadsRes.json();
    const invoicesData = await invoicesRes.json();
    setLoads(loadsData.loads || []);
    setInvoices(invoicesData.invoices || []);
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
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Customer Portal</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Customer Visibility</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Live load updates, digital tickets, and invoice history.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Active Loads</h2>
          {loads.slice(0, 6).map((load) => (
            <div key={load.id} className="ronyx-row" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{load.load_number}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{load.route}</div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{load.status}</div>
            </div>
          ))}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Invoices</h2>
          {invoices.slice(0, 6).map((invoice) => (
            <div key={invoice.id} className="ronyx-row" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{invoice.invoice_number}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{invoice.customer_name}</div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                ${Number(invoice.total_amount || 0).toFixed(2)} • {invoice.status}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
