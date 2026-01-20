"use client";

import Link from "next/link";
import { useState } from "react";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

const seedRules: Rule[] = [
  {
    id: "rule-1",
    name: "Escalate Late POD",
    trigger: 'Status="Delivered" for >2 hours AND POD=NULL',
    action: "Notify Dispatcher • Text Driver",
    enabled: true,
  },
  {
    id: "rule-2",
    name: "Auto-Invoice",
    trigger: 'Status changed to "POD Received"',
    action: "Generate PDF • Email Customer • Post to QuickBooks",
    enabled: true,
  },
  {
    id: "rule-3",
    name: "Detention Clock",
    trigger: "Truck enters Jobsite Geofence",
    action: "Start timer • Alert at 45 min • Bill at 60",
    enabled: true,
  },
  {
    id: "rule-4",
    name: "Driver Assignment Alert",
    trigger: 'New load in "Dispatched"',
    action: "Text 3 nearest available drivers",
    enabled: false,
  },
];

export default function WorkflowRulesPage() {
  const [rules, setRules] = useState<Rule[]>(seedRules);
  const [builder, setBuilder] = useState({
    field: "Ticket.NetWeight",
    operator: ">",
    value: "PlannedWeight * 1.02",
    secondField: "Ticket.NetWeight",
    secondOperator: "<",
    secondValue: "PlannedWeight * 0.98",
  });

  const addNewRule = () => {
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: "New Automation Rule",
      trigger: "Select trigger",
      action: "Select action",
      enabled: false,
    };
    setRules((prev) => [newRule, ...prev]);
  };

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)));
  };

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
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
          display: grid;
          grid-template-columns: minmax(160px, 1fr) minmax(220px, 2fr) minmax(220px, 2fr) 120px;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
          align-items: center;
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
        .ronyx-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-muted {
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.9rem;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Workflow Automation Rules</h1>
            <p className="ronyx-muted">Status: ACTIVE — Managing 142 loads with {rules.length} active rules.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ronyx-action" onClick={addNewRule}>
              + Add New Rule
            </button>
            <Link href="/ronyx/workflows" className="ronyx-action">
              Back to Workflows
            </Link>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 22 }}>
          <div className="ronyx-row" style={{ fontWeight: 700 }}>
            <span>Rule Name</span>
            <span>Trigger</span>
            <span>Action</span>
            <span>On/Off</span>
          </div>
          {rules.map((rule) => (
            <div key={rule.id} className="ronyx-row" style={{ marginTop: 10 }}>
              <span>{rule.name}</span>
              <span>{rule.trigger}</span>
              <span>{rule.action}</span>
              <button className="ronyx-action" onClick={() => toggleRule(rule.id)}>
                {rule.enabled ? "✅" : "⚠️"}
              </button>
            </div>
          ))}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Rule Builder — Flag Weight Discrepancy</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="ronyx-label">IF [ALL] of the following are true:</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 8 }}>
                  <input className="ronyx-input" value={builder.field} onChange={(e) => setBuilder({ ...builder, field: e.target.value })} />
                  <input className="ronyx-input" value={builder.operator} onChange={(e) => setBuilder({ ...builder, operator: e.target.value })} />
                  <input className="ronyx-input" value={builder.value} onChange={(e) => setBuilder({ ...builder, value: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 8 }}>
                  <input className="ronyx-input" value={builder.secondField} onChange={(e) => setBuilder({ ...builder, secondField: e.target.value })} />
                  <input className="ronyx-input" value={builder.secondOperator} onChange={(e) => setBuilder({ ...builder, secondOperator: e.target.value })} />
                  <input className="ronyx-input" value={builder.secondValue} onChange={(e) => setBuilder({ ...builder, secondValue: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <div className="ronyx-label">THEN take these actions:</div>
              <div className="ronyx-muted">
                1. Change status → Move ticket to &quot;Flagged&quot; <br />
                2. Send alert → Dispatcher via In-App & Email <br />
                3. Create task → Billing Manager: &quot;Review variance&quot; <br />
                4. Log → &quot;Auto-flagged by weight rule&quot;
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ronyx-action">Save Rule</button>
              <button className="ronyx-action">Test with Past Data</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
