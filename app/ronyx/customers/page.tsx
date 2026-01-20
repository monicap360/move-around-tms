"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  customer_name: string;
  customer_type?: string | null;
  billing_contact_name?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  payment_terms?: string | null;
  credit_limit?: number | null;
  average_days_to_pay?: number | null;
  tax_id?: string | null;
  insurance_expiry?: string | null;
  lien_waiver_required?: boolean | null;
};

const paymentTerms = ["net_15", "net_30", "net_45", "net_60", "cod", "weekly"];
const customerTypes = [
  "general_contractor",
  "subcontractor",
  "broker",
  "government",
  "private",
];

export default function RonyxCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_type: "general_contractor",
    billing_contact_name: "",
    billing_email: "",
    billing_phone: "",
    payment_terms: "net_30",
    credit_limit: "",
    average_days_to_pay: "",
    tax_id: "",
    insurance_expiry: "",
    lien_waiver_required: true,
  });

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/customers", { cache: "no-store" });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      customer_name: customer.customer_name || "",
      customer_type: customer.customer_type || "general_contractor",
      billing_contact_name: customer.billing_contact_name || "",
      billing_email: customer.billing_email || "",
      billing_phone: customer.billing_phone || "",
      payment_terms: customer.payment_terms || "net_30",
      credit_limit: customer.credit_limit?.toString() || "",
      average_days_to_pay: customer.average_days_to_pay?.toString() || "",
      tax_id: customer.tax_id || "",
      insurance_expiry: customer.insurance_expiry || "",
      lien_waiver_required: Boolean(customer.lien_waiver_required),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      customer_name: "",
      customer_type: "general_contractor",
      billing_contact_name: "",
      billing_email: "",
      billing_phone: "",
      payment_terms: "net_30",
      credit_limit: "",
      average_days_to_pay: "",
      tax_id: "",
      insurance_expiry: "",
      lien_waiver_required: true,
    });
  }

  async function saveCustomer() {
    if (!form.customer_name) {
      setMessage("Customer name is required.");
      return;
    }
    const payload = {
      ...form,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
      average_days_to_pay: form.average_days_to_pay
        ? Number(form.average_days_to_pay)
        : null,
    };
    const res = await fetch("/api/ronyx/customers", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    });
    if (!res.ok) {
      setMessage("Failed to save customer.");
      return;
    }
    setMessage(editingId ? "Customer updated." : "Customer added.");
    resetForm();
    await loadCustomers();
  }

  return (
    <div className="ronyx-shell">
      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Billing Engine</p>
          <h1>Customers</h1>
          <p className="ronyx-muted">
            Manage dump‑truck customer profiles, payment terms, and compliance flags.
          </p>
        </div>
        <Link href="/ronyx" className="ronyx-action">
          Back to Dashboard
        </Link>
      </header>

      <section className="ronyx-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          {editingId ? "Edit Customer" : "Add Customer"}
        </h2>
        {message && <div className="ronyx-tag">{message}</div>}
        <div className="ronyx-grid" style={{ rowGap: 16 }}>
          <div>
            <label className="ronyx-label">Customer Name</label>
            <input
              className="ronyx-input"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Customer Type</label>
            <select
              className="ronyx-input"
              value={form.customer_type}
              onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
            >
              {customerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Billing Contact</label>
            <input
              className="ronyx-input"
              value={form.billing_contact_name}
              onChange={(e) => setForm({ ...form, billing_contact_name: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Billing Email</label>
            <input
              className="ronyx-input"
              value={form.billing_email}
              onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Billing Phone</label>
            <input
              className="ronyx-input"
              value={form.billing_phone}
              onChange={(e) => setForm({ ...form, billing_phone: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Payment Terms</label>
            <select
              className="ronyx-input"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            >
              {paymentTerms.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Credit Limit</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Average Days to Pay</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.average_days_to_pay}
              onChange={(e) =>
                setForm({ ...form, average_days_to_pay: e.target.value })
              }
            />
          </div>
          <div>
            <label className="ronyx-label">Tax ID</label>
            <input
              className="ronyx-input"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Insurance Expiry</label>
            <input
              type="date"
              className="ronyx-input"
              value={form.insurance_expiry}
              onChange={(e) =>
                setForm({ ...form, insurance_expiry: e.target.value })
              }
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Lien Waiver Required</span>
            <input
              type="checkbox"
              checked={form.lien_waiver_required}
              onChange={(e) =>
                setForm({ ...form, lien_waiver_required: e.target.checked })
              }
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="ronyx-action" onClick={saveCustomer}>
            {editingId ? "Update Customer" : "Add Customer"}
          </button>
          <button className="ronyx-action" onClick={resetForm}>
            Clear
          </button>
        </div>
      </section>

      <section className="ronyx-card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          Customer Directory
        </h2>
        {loading ? (
          <div className="ronyx-row">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="ronyx-row">No customers yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Type</th>
                  <th style={{ padding: "8px 6px" }}>Payment</th>
                  <th style={{ padding: "8px 6px" }}>Contact</th>
                  <th style={{ padding: "8px 6px" }}>Lien</th>
                  <th style={{ padding: "8px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{customer.customer_name}</td>
                    <td style={{ padding: "8px 6px" }}>{customer.customer_type || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{customer.payment_terms || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {customer.billing_contact_name || "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {customer.lien_waiver_required ? "✅" : "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => startEdit(customer)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
