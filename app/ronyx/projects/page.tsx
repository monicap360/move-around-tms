"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  customer_name: string;
};

type Project = {
  id: string;
  project_code?: string | null;
  project_name?: string | null;
  project_address?: string | null;
  project_manager?: string | null;
  start_date?: string | null;
  estimated_end_date?: string | null;
  customer_id?: string | null;
  rate_per_ton?: number | null;
  rate_per_cy?: number | null;
  rate_per_load?: number | null;
  min_daily_rate?: number | null;
  retainage_percent?: number | null;
  fuel_surcharge_applicable?: boolean | null;
  waiting_rate_per_minute?: number | null;
  active?: boolean | null;
};

export default function RonyxProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    project_code: "",
    project_name: "",
    project_address: "",
    project_manager: "",
    customer_id: "",
    start_date: "",
    estimated_end_date: "",
    rate_per_ton: "",
    rate_per_cy: "",
    rate_per_load: "",
    min_daily_rate: "",
    retainage_percent: "10",
    fuel_surcharge_applicable: true,
    waiting_rate_per_minute: "",
    active: true,
  });

  useEffect(() => {
    void loadProjects();
    void loadCustomers();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const res = await fetch("/api/ronyx/customers", { cache: "no-store" });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      project_code: project.project_code || "",
      project_name: project.project_name || "",
      project_address: project.project_address || "",
      project_manager: project.project_manager || "",
      customer_id: project.customer_id || "",
      start_date: project.start_date || "",
      estimated_end_date: project.estimated_end_date || "",
      rate_per_ton: project.rate_per_ton?.toString() || "",
      rate_per_cy: project.rate_per_cy?.toString() || "",
      rate_per_load: project.rate_per_load?.toString() || "",
      min_daily_rate: project.min_daily_rate?.toString() || "",
      retainage_percent: project.retainage_percent?.toString() || "10",
      fuel_surcharge_applicable: project.fuel_surcharge_applicable ?? true,
      waiting_rate_per_minute: project.waiting_rate_per_minute?.toString() || "",
      active: project.active ?? true,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      project_code: "",
      project_name: "",
      project_address: "",
      project_manager: "",
      customer_id: "",
      start_date: "",
      estimated_end_date: "",
      rate_per_ton: "",
      rate_per_cy: "",
      rate_per_load: "",
      min_daily_rate: "",
      retainage_percent: "10",
      fuel_surcharge_applicable: true,
      waiting_rate_per_minute: "",
      active: true,
    });
  }

  async function saveProject() {
    if (!form.project_name) {
      setMessage("Project name is required.");
      return;
    }

    const payload = {
      ...form,
      customer_id: form.customer_id || null,
      rate_per_ton: form.rate_per_ton ? Number(form.rate_per_ton) : null,
      rate_per_cy: form.rate_per_cy ? Number(form.rate_per_cy) : null,
      rate_per_load: form.rate_per_load ? Number(form.rate_per_load) : null,
      min_daily_rate: form.min_daily_rate ? Number(form.min_daily_rate) : null,
      retainage_percent: form.retainage_percent
        ? Number(form.retainage_percent)
        : null,
      waiting_rate_per_minute: form.waiting_rate_per_minute
        ? Number(form.waiting_rate_per_minute)
        : null,
    };

    const res = await fetch("/api/ronyx/projects", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    });

    if (!res.ok) {
      setMessage("Failed to save project.");
      return;
    }

    setMessage(editingId ? "Project updated." : "Project added.");
    resetForm();
    await loadProjects();
  }

  return (
    <div className="ronyx-shell">
      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Billing Engine</p>
          <h1>Projects</h1>
          <p className="ronyx-muted">
            Set rate cards, retainage, and terms per customer project.
          </p>
        </div>
        <Link href="/ronyx" className="ronyx-action">
          Back to Dashboard
        </Link>
      </header>

      <section className="ronyx-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          {editingId ? "Edit Project" : "Add Project"}
        </h2>
        {message && <div className="ronyx-tag">{message}</div>}
        <div className="ronyx-grid" style={{ rowGap: 16 }}>
          <div>
            <label className="ronyx-label">Project Code</label>
            <input
              className="ronyx-input"
              value={form.project_code}
              onChange={(e) => setForm({ ...form, project_code: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Project Name</label>
            <input
              className="ronyx-input"
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Customer</label>
            <select
              className="ronyx-input"
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Project Manager</label>
            <input
              className="ronyx-input"
              value={form.project_manager}
              onChange={(e) => setForm({ ...form, project_manager: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Project Address</label>
            <input
              className="ronyx-input"
              value={form.project_address}
              onChange={(e) => setForm({ ...form, project_address: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Start Date</label>
            <input
              type="date"
              className="ronyx-input"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Estimated End</label>
            <input
              type="date"
              className="ronyx-input"
              value={form.estimated_end_date}
              onChange={(e) =>
                setForm({ ...form, estimated_end_date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="ronyx-label">Rate per Ton</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.rate_per_ton}
              onChange={(e) => setForm({ ...form, rate_per_ton: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Rate per CY</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.rate_per_cy}
              onChange={(e) => setForm({ ...form, rate_per_cy: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Rate per Load</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.rate_per_load}
              onChange={(e) => setForm({ ...form, rate_per_load: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Min Daily Rate</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.min_daily_rate}
              onChange={(e) =>
                setForm({ ...form, min_daily_rate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="ronyx-label">Retainage %</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.retainage_percent}
              onChange={(e) =>
                setForm({ ...form, retainage_percent: e.target.value })
              }
            />
          </div>
          <div>
            <label className="ronyx-label">Waiting Rate / Minute</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.waiting_rate_per_minute}
              onChange={(e) =>
                setForm({ ...form, waiting_rate_per_minute: e.target.value })
              }
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Fuel Surcharge</span>
            <input
              type="checkbox"
              checked={form.fuel_surcharge_applicable}
              onChange={(e) =>
                setForm({ ...form, fuel_surcharge_applicable: e.target.checked })
              }
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Active Project</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="ronyx-action" onClick={saveProject}>
            {editingId ? "Update Project" : "Add Project"}
          </button>
          <button className="ronyx-action" onClick={resetForm}>
            Clear
          </button>
        </div>
      </section>

      <section className="ronyx-card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          Project List
        </h2>
        {loading ? (
          <div className="ronyx-row">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="ronyx-row">No projects yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Code</th>
                  <th style={{ padding: "8px 6px" }}>Project</th>
                  <th style={{ padding: "8px 6px" }}>Customer</th>
                  <th style={{ padding: "8px 6px" }}>Rates</th>
                  <th style={{ padding: "8px 6px" }}>Active</th>
                  <th style={{ padding: "8px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{project.project_code || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{project.project_name || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {customers.find((c) => c.id === project.customer_id)?.customer_name || "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {project.rate_per_ton ? `$${project.rate_per_ton}/T` : "—"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{project.active ? "✅" : "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <button className="btn-sm btn-secondary" onClick={() => startEdit(project)}>
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
