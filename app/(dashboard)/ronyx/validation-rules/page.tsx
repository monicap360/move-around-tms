"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Rule = {
  rule_id: number;
  rule_type: string;
  rule_name: string;
  rule_logic: any;
  threshold?: number | null;
  severity: string;
  auto_correct: boolean;
  project_specific: boolean;
  active: boolean;
};

const ruleTypes = ["distance", "weight", "time", "location", "photo", "signature"];
const severities = ["warning", "error", "block"];

export default function ValidationRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    rule_type: "distance",
    rule_name: "",
    rule_logic: "{}",
    threshold: "",
    severity: "warning",
    auto_correct: false,
    project_specific: true,
    active: true,
  });

  useEffect(() => {
    void loadRules();
  }, []);

  async function loadRules() {
    const res = await fetch("/api/ronyx/validation-rules", { cache: "no-store" });
    const data = await res.json();
    setRules(data.rules || []);
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.rule_id);
    setForm({
      rule_type: rule.rule_type,
      rule_name: rule.rule_name,
      rule_logic: JSON.stringify(rule.rule_logic || {}, null, 2),
      threshold: rule.threshold?.toString() || "",
      severity: rule.severity,
      auto_correct: Boolean(rule.auto_correct),
      project_specific: Boolean(rule.project_specific),
      active: Boolean(rule.active),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      rule_type: "distance",
      rule_name: "",
      rule_logic: "{}",
      threshold: "",
      severity: "warning",
      auto_correct: false,
      project_specific: true,
      active: true,
    });
  }

  async function saveRule() {
    if (!form.rule_name) {
      setMessage("Rule name is required.");
      return;
    }
    let ruleLogic: any = {};
    try {
      ruleLogic = JSON.parse(form.rule_logic || "{}");
    } catch {
      setMessage("Rule logic must be valid JSON.");
      return;
    }
    const payload = {
      ...form,
      rule_logic: ruleLogic,
      threshold: form.threshold ? Number(form.threshold) : null,
    };

    const res = await fetch("/api/ronyx/validation-rules", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, rule_id: editingId } : payload),
    });

    if (!res.ok) {
      setMessage("Failed to save rule.");
      return;
    }
    setMessage(editingId ? "Rule updated." : "Rule created.");
    resetForm();
    await loadRules();
  }

  return (
    <div className="ronyx-shell">
      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • AI Validation</p>
          <h1>Validation Rules</h1>
          <p className="ronyx-muted">
            Manage AI validation thresholds and automation rules for tickets.
          </p>
        </div>
        <Link href="/ronyx" className="ronyx-action">
          Back to Dashboard
        </Link>
      </header>

      <section className="ronyx-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          {editingId ? "Edit Rule" : "Add Rule"}
        </h2>
        {message && <div className="ronyx-tag">{message}</div>}
        <div className="ronyx-grid" style={{ rowGap: 16 }}>
          <div>
            <label className="ronyx-label">Rule Type</label>
            <select
              className="ronyx-input"
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
            >
              {ruleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Rule Name</label>
            <input
              className="ronyx-input"
              value={form.rule_name}
              onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Severity</label>
            <select
              className="ronyx-input"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              {severities.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Threshold</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="ronyx-label">Rule Logic (JSON)</label>
            <textarea
              className="ronyx-input"
              rows={6}
              value={form.rule_logic}
              onChange={(e) => setForm({ ...form, rule_logic: e.target.value })}
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Auto Correct</span>
            <input
              type="checkbox"
              checked={form.auto_correct}
              onChange={(e) => setForm({ ...form, auto_correct: e.target.checked })}
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Project Specific</span>
            <input
              type="checkbox"
              checked={form.project_specific}
              onChange={(e) =>
                setForm({ ...form, project_specific: e.target.checked })
              }
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Active</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="ronyx-action" onClick={saveRule}>
            {editingId ? "Update Rule" : "Add Rule"}
          </button>
          <button className="ronyx-action" onClick={resetForm}>
            Clear
          </button>
        </div>
      </section>

      <section className="ronyx-card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          Active Rules
        </h2>
        {rules.length === 0 ? (
          <div className="ronyx-row">No rules yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Type</th>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Severity</th>
                  <th style={{ padding: "8px 6px" }}>Threshold</th>
                  <th style={{ padding: "8px 6px" }}>Active</th>
                  <th style={{ padding: "8px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.rule_id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{rule.rule_type}</td>
                    <td style={{ padding: "8px 6px" }}>{rule.rule_name}</td>
                    <td style={{ padding: "8px 6px" }}>{rule.severity}</td>
                    <td style={{ padding: "8px 6px" }}>{rule.threshold ?? "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{rule.active ? "✅" : "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <button className="btn-sm btn-secondary" onClick={() => startEdit(rule)}>
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
