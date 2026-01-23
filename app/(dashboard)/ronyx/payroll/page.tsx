"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Driver = { id: string; name: string };
type Rule = { id: string; driver_id: string; pay_type: string; pay_rate: number };
type Deduction = { id: string; driver_id: string; description: string; amount: number; is_active: boolean };
type PayrollResult = {
  driver_id: string | null;
  driver_name: string;
  pay_type: string;
  pay_rate: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  ticket_ids: string[];
  tickets: any[];
};

export default function RonyxPayrollPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [results, setResults] = useState<PayrollResult[]>([]);
  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDriver, setSelectedDriver] = useState("");
  const [message, setMessage] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState({ driver_id: "", pay_type: "per_ton", pay_rate: "" });
  const [deductionForm, setDeductionForm] = useState({
    driver_id: "",
    deduction_type: "Loan Repayment",
    description: "",
    amount: "",
  });

  useEffect(() => {
    void loadDrivers();
    void loadRules();
    void loadDeductions();
  }, []);

  async function loadDrivers() {
    const res = await fetch("/api/ronyx/drivers/list");
    const data = await res.json();
    setDrivers(data.drivers || []);
  }

  async function loadRules() {
    const res = await fetch("/api/ronyx/payroll/rules");
    const data = await res.json();
    setRules(data.rules || []);
  }

  async function loadDeductions() {
    const res = await fetch("/api/ronyx/payroll/deductions");
    const data = await res.json();
    setDeductions(data.deductions || []);
  }

  async function saveRule() {
    const payload = {
      driver_id: ruleForm.driver_id,
      pay_type: ruleForm.pay_type,
      pay_rate: Number(ruleForm.pay_rate || 0),
    };
    const existing = rules.find((r) => r.driver_id === ruleForm.driver_id);
    const res = await fetch("/api/ronyx/payroll/rules", {
      method: existing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existing ? { id: existing.id, ...payload } : payload),
    });
    const data = await res.json();
    if (data.rule) {
      setRules((prev) => {
        const filtered = prev.filter((r) => r.id !== data.rule.id);
        return [data.rule, ...filtered];
      });
      setRuleForm({ driver_id: "", pay_type: "per_ton", pay_rate: "" });
    }
  }

  async function saveDeduction() {
    const prefix = deductionForm.deduction_type ? `${deductionForm.deduction_type}: ` : "";
    const payload = {
      driver_id: deductionForm.driver_id,
      description: `${prefix}${deductionForm.description}`.trim(),
      amount: Number(deductionForm.amount || 0),
      is_active: true,
    };
    const res = await fetch("/api/ronyx/payroll/deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.deduction) {
      setDeductions((prev) => [data.deduction, ...prev]);
      setDeductionForm({ driver_id: "", deduction_type: "Loan Repayment", description: "", amount: "" });
    }
  }

  async function calculatePayroll() {
    setMessage("");
    const res = await fetch("/api/ronyx/payroll/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_date: periodStart,
        end_date: periodEnd,
        driver_id: selectedDriver || undefined,
      }),
    });
    const data = await res.json();
    setResults(data.results || []);
  }

  async function approvePayroll() {
    if (results.length === 0) return;
    const res = await fetch("/api/ronyx/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period_start: periodStart,
        period_end: periodEnd,
        items: results,
      }),
    });
    const data = await res.json();
    if (data.run) {
      setRunId(data.run.id);
      setMessage("Payroll approved.");
    }
  }

  async function reopenPayroll() {
    if (!runId) return;
    const res = await fetch("/api/ronyx/payroll/runs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: runId, status: "draft" }),
    });
    const data = await res.json();
    if (data.run) {
      setMessage("Payroll reopened.");
    }
  }

  function exportQuickBooks() {
    if (!runId) {
      setMessage("Approve payroll first to export.");
      return;
    }
    window.location.href = `/api/ronyx/quickbooks/export?type=payroll&run_id=${runId}`;
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
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Payroll</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Ticket‑to‑Driver Payroll</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Calculate driver pay from delivered tickets and export to QuickBooks.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Driver Pay Rules</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <select className="ronyx-input" value={ruleForm.driver_id} onChange={(e) => setRuleForm({ ...ruleForm, driver_id: e.target.value })}>
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <select className="ronyx-input" value={ruleForm.pay_type} onChange={(e) => setRuleForm({ ...ruleForm, pay_type: e.target.value })}>
              <option value="per_ton">$/Ton</option>
              <option value="per_yard">$/Yard (Owner-Operator)</option>
              <option value="per_hour">$/Hour (Load Hours)</option>
              <option value="hourly">Hourly (RONYX Employee)</option>
              <option value="percentage">% of Ticket (Owner-Operator)</option>
              <option value="per_load">$/Load</option>
            </select>
            <input className="ronyx-input" type="number" placeholder="Rate" value={ruleForm.pay_rate} onChange={(e) => setRuleForm({ ...ruleForm, pay_rate: e.target.value })} />
            <button className="ronyx-action" onClick={saveRule}>Save Rule</button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {rules.map((rule) => (
              <div key={rule.id} className="ronyx-row">
                <span>{drivers.find((d) => d.id === rule.driver_id)?.name || "Driver"}</span>
                <span>
                  {rule.pay_type === "percentage"
                    ? `${rule.pay_type} @ ${Number(rule.pay_rate || 0).toFixed(2)}%`
                    : `${rule.pay_type} @ $${Number(rule.pay_rate || 0).toFixed(2)}`}
                  {rule.pay_type === "hourly" ? " • RONYX Employee" : " • Owner-Operator"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Recurring Deductions</h2>
          <p style={{ color: "rgba(15,23,42,0.7)", marginBottom: 12 }}>
            Truck Parking deductions are applied monthly based on the payroll period.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <select className="ronyx-input" value={deductionForm.driver_id} onChange={(e) => setDeductionForm({ ...deductionForm, driver_id: e.target.value })}>
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <select
              className="ronyx-input"
              value={deductionForm.deduction_type}
              onChange={(e) => setDeductionForm({ ...deductionForm, deduction_type: e.target.value })}
            >
              <option value="Loan Repayment">Loan Repayment</option>
              <option value="Truck Parking">Truck Parking</option>
              <option value="Fuel Advance">Fuel Advance</option>
              <option value="Other">Other</option>
            </select>
            <input className="ronyx-input" placeholder="Deduction description" value={deductionForm.description} onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })} />
            <input className="ronyx-input" type="number" placeholder="Amount" value={deductionForm.amount} onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })} />
            <button className="ronyx-action" onClick={saveDeduction}>Add Deduction</button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {deductions.map((deduction) => (
              <div key={deduction.id} className="ronyx-row">
                <span>{drivers.find((d) => d.id === deduction.driver_id)?.name || "Driver"}</span>
                <span>{deduction.description} • ${Number(deduction.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Payroll Calculation</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <label className="ronyx-label">Pay Period Start</label>
            <input className="ronyx-input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <label className="ronyx-label">Pay Period End</label>
            <input className="ronyx-input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            <label className="ronyx-label">Driver (optional)</label>
            <select className="ronyx-input" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
              <option value="">All drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <button className="ronyx-action primary" onClick={calculatePayroll}>Calculate Payroll</button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {results.map((result) => (
              <div key={result.driver_name} className="ronyx-row">
                <div>
                  <div style={{ fontWeight: 700 }}>{result.driver_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    Tickets: {result.ticket_ids.length} • Gross ${result.gross_pay.toFixed(2)}
                  </div>
                  {result.tickets?.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: "0.75rem", color: "rgba(15,23,42,0.6)" }}>
                      {result.tickets.slice(0, 5).map((ticket: any) => (
                        <div key={ticket.id}>
                          #{ticket.ticket_number || "Ticket"} • {ticket.quantity ?? "—"} {ticket.unit_type || ""}
                        </div>
                      ))}
                      {result.tickets.length > 5 ? `+${result.tickets.length - 5} more` : null}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>Net ${result.net_pay.toFixed(2)}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    Deductions ${result.deductions.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Approve & Export</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="ronyx-action primary" onClick={approvePayroll}>Approve Payroll</button>
            <button className="ronyx-action" onClick={reopenPayroll}>Re‑open Pay Period</button>
            <button className="ronyx-action" onClick={exportQuickBooks}>Export for QuickBooks</button>
          </div>
          {message ? <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{message}</div> : null}
        </section>
      </div>
    </div>
  );
}
