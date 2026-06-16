"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Contract = {
  id: string;
  company_name: string;
  customer_id?: string | null;
  contract_type: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  rate_type: string;
  rate_amount?: number | null;
  material_type?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  signed_date?: string | null;
  signed_by?: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  customer_name: string;
};

const CONTRACT_COMPANIES = [
  "TC Red Wine Services",
  "BAS Equipment & Trucking Services, LLC",
];

const CONTRACT_TYPES = ["hauling", "transportation", "material_supply", "equipment_rental", "subcontract", "other"];
const RATE_TYPES = ["per_ton", "per_load", "per_hour", "flat_rate", "per_mile"];
const STATUSES = ["active", "pending", "expired", "terminated", "draft"];
const MATERIALS = ["aggregates", "dirt_fill", "sand", "limestone", "crushed_concrete", "asphalt", "rip_rap", "topsoil", "clay", "mixed_load", "other"];

const statusColor: Record<string, { bg: string; color: string }> = {
  active:     { bg: "#dcfce7", color: "#166534" },
  pending:    { bg: "#fef9c3", color: "#854d0e" },
  expired:    { bg: "#fee2e2", color: "#991b1b" },
  terminated: { bg: "#f1f5f9", color: "#475569" },
  draft:      { bg: "#ede9fe", color: "#5b21b6" },
};

const BLANK_FORM = {
  company_name:  "",
  contract_type: "hauling",
  status:        "active",
  start_date:    "",
  end_date:      "",
  rate_type:     "per_ton",
  rate_amount:   "",
  material_type: "",
  contact_name:  "",
  contact_email: "",
  contact_phone: "",
  notes:         "",
  signed_date:   "",
  signed_by:     "",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  useEffect(() => {
    void Promise.all([loadContracts(), loadCustomers()]);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadContracts() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/contracts", { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContracts(data.contracts || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load contracts", false);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const res = await fetch("/api/ronyx/customers", { cache: "no-store" });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      // non-fatal
    }
  }

  // Merge hardcoded companies with DB customers for the dropdown
  const companyOptions: string[] = [
    ...CONTRACT_COMPANIES,
    ...customers
      .map((c) => c.customer_name)
      .filter((n) => !CONTRACT_COMPANIES.map((x) => x.toLowerCase()).includes(n.toLowerCase())),
  ];

  function startNew() {
    setEditingId(null);
    setForm({ ...BLANK_FORM, company_name: CONTRACT_COMPANIES[0] });
    setShowForm(true);
  }

  function startEdit(c: Contract) {
    setEditingId(c.id);
    setForm({
      company_name:  c.company_name,
      contract_type: c.contract_type,
      status:        c.status,
      start_date:    c.start_date    || "",
      end_date:      c.end_date      || "",
      rate_type:     c.rate_type,
      rate_amount:   c.rate_amount?.toString() || "",
      material_type: c.material_type || "",
      contact_name:  c.contact_name  || "",
      contact_email: c.contact_email || "",
      contact_phone: c.contact_phone || "",
      notes:         c.notes         || "",
      signed_date:   c.signed_date   || "",
      signed_by:     c.signed_by     || "",
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...BLANK_FORM });
  }

  async function saveContract() {
    if (!form.company_name) { showToast("Company name is required", false); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        rate_amount: form.rate_amount ? Number(form.rate_amount) : null,
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch("/api/ronyx/contracts", {
        method:  editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast(editingId ? "Contract updated." : "Contract created.");
      cancelForm();
      await loadContracts();
    } catch (err: any) {
      showToast(err.message || "Failed to save", false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(id: string, name: string) {
    if (!confirm(`Delete contract for ${name}?`)) return;
    try {
      const res = await fetch("/api/ronyx/contracts", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast("Contract deleted.");
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      showToast(err.message || "Delete failed", false);
    }
  }

  const filtered = filterStatus === "all"
    ? contracts
    : contracts.filter((c) => c.status === filterStatus);

  const stats = {
    total:     contracts.length,
    active:    contracts.filter((c) => c.status === "active").length,
    pending:   contracts.filter((c) => c.status === "pending").length,
    expired:   contracts.filter((c) => c.status === "expired").length,
  };

  function fmtRate(c: Contract) {
    if (!c.rate_amount) return "—";
    const type = c.rate_type === "per_ton" ? "/ton" : c.rate_type === "per_load" ? "/load" : c.rate_type === "per_hour" ? "/hr" : c.rate_type === "per_mile" ? "/mi" : "";
    return `$${Number(c.rate_amount).toFixed(2)}${type}`;
  }

  function fmtDate(d?: string | null) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };

  return (
    <div className="ronyx-shell">
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "10px 18px", borderRadius: 8, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Contracts</p>
          <h1>Hauling Contracts</h1>
          <p className="ronyx-muted">Service agreements for customer companies Ronyx hauls for.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ronyx-action" onClick={startNew}>+ New Contract</button>
          <Link href="/ronyx" className="ronyx-action" style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#475569" }}>Dashboard</Link>
        </div>
      </header>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Contracts", value: stats.total,   color: "#0ea5e9" },
          { label: "Active",          value: stats.active,  color: "#22c55e" },
          { label: "Pending",         value: stats.pending, color: "#f59e0b" },
          { label: "Expired",         value: stats.expired, color: "#ef4444" },
        ].map((k) => (
          <div key={k.label} className="ronyx-card" style={{ padding: "14px 16px", borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Contract form */}
      {showForm && (
        <section className="ronyx-card" style={{ marginBottom: 20, borderLeft: "4px solid #0ea5e9" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>
            {editingId ? "Edit Contract" : "New Contract"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {/* Company dropdown */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Customer Company *</label>
              <select
                style={{ ...inp, fontSize: 14, fontWeight: 600 }}
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              >
                <option value="">— Select company —</option>
                {companyOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Contract Type</label>
              <select style={inp} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Start Date</label>
              <input type="date" style={inp} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>End Date</label>
              <input type="date" style={inp} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Rate Type</label>
              <select style={inp} value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Rate Amount ($)</label>
              <input type="number" step="0.01" style={inp} placeholder="e.g. 6.50" value={form.rate_amount} onChange={(e) => setForm({ ...form, rate_amount: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Material Type</label>
              <select style={inp} value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })}>
                <option value="">— Any / Not specified —</option>
                {MATERIALS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Contact Name</label>
              <input style={inp} placeholder="Primary contact" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Contact Email</label>
              <input type="email" style={inp} placeholder="email@company.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Contact Phone</label>
              <input style={inp} placeholder="(713) 555-0100" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Signed Date</label>
              <input type="date" style={inp} value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} />
            </div>

            <div>
              <label style={lbl}>Signed By</label>
              <input style={inp} placeholder="Signatory name" value={form.signed_by} onChange={(e) => setForm({ ...form, signed_by: e.target.value })} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="Contract notes, scope, conditions…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="ronyx-action" onClick={saveContract} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update Contract" : "Create Contract"}
            </button>
            <button className="ronyx-action" onClick={cancelForm} style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#475569" }}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {["all", "active", "pending", "expired", "terminated", "draft"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: filterStatus === s ? "#0f172a" : "#fff",
              color: filterStatus === s ? "#fff" : "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== "all" && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({contracts.filter((c) => c.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contracts table */}
      <section className="ronyx-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
            {filterStatus === "all" ? "All Contracts" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) + " Contracts"}
            <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b", fontWeight: 400 }}>({filtered.length})</span>
          </h2>
        </div>

        {loading ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: "20px 0" }}>Loading contracts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
            No contracts found.{" "}
            <button style={{ color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }} onClick={startNew}>
              Create the first one
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left" }}>
                  {["Company", "Type", "Status", "Rate", "Material", "Dates", "Contact", ""].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const sc = statusColor[c.status] || { bg: "#f1f5f9", color: "#475569" };
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 10px", fontWeight: 600, color: "#0f172a", maxWidth: 200 }}>
                        {c.company_name}
                      </td>
                      <td style={{ padding: "10px 10px", color: "#475569" }}>
                        {c.contract_type.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase())}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ ...sc, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 10px", fontWeight: 600, color: "#166534" }}>{fmtRate(c)}</td>
                      <td style={{ padding: "10px 10px", color: "#475569" }}>
                        {c.material_type ? c.material_type.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()) : "—"}
                      </td>
                      <td style={{ padding: "10px 10px", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>
                        {c.start_date ? fmtDate(c.start_date) : "—"}
                        {c.end_date ? ` → ${fmtDate(c.end_date)}` : ""}
                      </td>
                      <td style={{ padding: "10px 10px", color: "#64748b", fontSize: 12 }}>
                        {c.contact_name || "—"}
                        {c.contact_phone ? <><br />{c.contact_phone}</> : null}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => startEdit(c)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteContract(c.id, c.company_name)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", color: "#991b1b", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Customer Companies panel */}
      <section className="ronyx-card" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Customer Companies on File</h2>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Companies Ronyx hauls for. These appear in the contract company dropdown.{" "}
          <Link href="/ronyx/customers" style={{ color: "#0ea5e9" }}>Manage in Customers →</Link>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {companyOptions.map((name) => {
            const contractCount = contracts.filter((c) => c.company_name === name).length;
            const hasActive = contracts.some((c) => c.company_name === name && c.status === "active");
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: hasActive ? "#f0fdf4" : "#f8fafc", border: `1px solid ${hasActive ? "#86efac" : "#e2e8f0"}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasActive ? "#22c55e" : "#94a3b8" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{name}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {contractCount} contract{contractCount !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => { setForm({ ...BLANK_FORM, company_name: name }); setEditingId(null); setShowForm(true); }}
                  style={{ fontSize: 11, color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  + Add contract
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
