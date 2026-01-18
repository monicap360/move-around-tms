"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const quarters = ["Q2 2024", "Q1 2024", "Q4 2023", "Q3 2023"];

export default function IftaFuelCompliancePage() {
  const [activeQuarter, setActiveQuarter] = useState(quarters[0]);
  const [summary, setSummary] = useState({
    status: "🟡 Collecting Data (Quarter ends in 14 days)",
    projected: "$3,850 owed",
    risk: "LOW",
    alerts: "12 missing fuel receipts | 3 trucks need odometer readings",
  });
  const [snapshot, setSnapshot] = useState({
    totalMiles: "42,850",
    gallons: "6,425",
    avgMpg: "6.7",
    bestWorst: "Best: Truck #12 (7.2) | Worst: Truck #18 (6.1)",
    taxOwed: "$3,850",
    due: "July 31, 2024",
    costPerGallon: "$3.85/gal",
    fuelTotal: "$24,736",
  });
  const [stateRows, setStateRows] = useState<
    { state: string; miles: number; pct: string; gallons: number; mpg: string; taxRate: string; tax: string; proof: string; needsFix?: boolean }[]
  >([]);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<
    { id: string; title: string; detail: string; actions: string[] }[]
  >([]);
  const [mpgRows, setMpgRows] = useState<
    { rank: number; truck: string; driver: string; mpg: string; costPerMile: string; action: string }[]
  >([]);
  const [analysisCards, setAnalysisCards] = useState<
    { title: string; value: string; trend: string }[]
  >([]);
  const [dailyFuelCaptures, setDailyFuelCaptures] = useState<string[]>([]);
  const [dailyMileage, setDailyMileage] = useState({
    truck: "12",
    odometer: 125430,
    miles: "142 mi",
    byState: "TX: 85 mi | LA: 57 mi",
    fuelUsed: "21.2 gal (6.7 MPG)",
  });

  useEffect(() => {
    void loadDashboard(activeQuarter);
  }, [activeQuarter]);

  const loadDashboard = async (quarter: string) => {
    const [summaryRes, snapshotRes, mileageRes, queueRes, alertsRes, perfRes] = await Promise.all([
      fetch(`/api/ifta/quarter?quarter=${encodeURIComponent(quarter)}`),
      fetch(`/api/ifta/quarter?quarter=${encodeURIComponent(quarter)}&snapshot=true`),
      fetch(`/api/ifta/mileage/state?quarter=${encodeURIComponent(quarter)}`),
      fetch(`/api/ifta/fuel-receipts?quarter=${encodeURIComponent(quarter)}`),
      fetch(`/api/ifta/alerts?quarter=${encodeURIComponent(quarter)}`),
      fetch(`/api/ifta/performance?quarter=${encodeURIComponent(quarter)}`),
    ]);
    const summaryJson = await summaryRes.json();
    const snapshotJson = await snapshotRes.json();
    const mileageJson = await mileageRes.json();
    const queueJson = await queueRes.json();
    const alertsJson = await alertsRes.json();
    const perfJson = await perfRes.json();

    setSummary(summaryJson.summary || summary);
    setSnapshot(snapshotJson.snapshot || snapshot);
    setStateRows(mileageJson.rows || []);
    setProcessingQueue(queueJson.queue || []);
    setDailyFuelCaptures(queueJson.today || []);
    setAlerts(alertsJson.alerts || []);
    setMpgRows(perfJson.mpgRows || []);
    setAnalysisCards(perfJson.analysis || []);
  };

  const syncFuelCards = async () => {
    await fetch("/api/ifta/fuel-cards/sync", { method: "POST" });
    await loadDashboard(activeQuarter);
  };

  const uploadFuelReceipts = async () => {
    await fetch("/api/ifta/fuel-receipts", { method: "POST" });
    await loadDashboard(activeQuarter);
  };

  const saveDailyMileage = async () => {
    await fetch("/api/ifta/mileage/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dailyMileage),
    });
    await loadDashboard(activeQuarter);
  };

  const prepareReturn = async () => {
    await fetch("/api/ifta/returns/prepare", { method: "POST" });
  };

  const fileReturn = async () => {
    await fetch("/api/ifta/returns/file", { method: "POST" });
  };

  const generateAuditPackage = async () => {
    await fetch("/api/ifta/audit/package", { method: "POST" });
  };

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
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
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
          border-color: var(--ronyx-accent);
        }
        .quarter-selector {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .q-btn {
          border: 1px solid var(--ronyx-border);
          background: #ffffff;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 600;
        }
        .q-btn.active {
          background: rgba(29, 78, 216, 0.12);
          border-color: rgba(29, 78, 216, 0.4);
        }
        .snapshot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .metric-card {
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 14px;
          background: #f8fafc;
          display: grid;
          gap: 8px;
        }
        .metric-card.critical {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
        }
        .metric-value {
          font-size: 1.4rem;
          font-weight: 800;
        }
        .capture-card,
        .mobile-capture,
        .receipt-processing,
        .state-mileage-tracker,
        .audit-filing,
        .performance-metrics,
        .compliance-alerts {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 18px;
          margin-bottom: 20px;
          display: grid;
          gap: 12px;
        }
        .capture-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
        }
        .capture-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .option-card {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          cursor: pointer;
        }
        .recent-captures,
        .daily-summary,
        .processing-queue,
        .filing-status,
        .audit-package,
        .fuel-analysis,
        .mpg-leaderboard {
          display: grid;
          gap: 10px;
        }
        .mileage-form {
          display: grid;
          gap: 12px;
        }
        .odometer-input {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.12);
        }
        .bulk-upload-zone {
          border: 1px dashed rgba(15, 23, 42, 0.2);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 10px;
          background: #f8fafc;
        }
        .processing-steps {
          display: grid;
          gap: 8px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: rgba(29, 78, 216, 0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .ifta-map {
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 14px;
          background: #f8fafc;
        }
        .map-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }
        .state-card {
          border-radius: 12px;
          padding: 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
        }
        .map-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 0.85rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .color-box {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          background: #cbd5f5;
        }
        .color-box.high {
          background: #fca5a5;
        }
        .color-box.medium {
          background: #fde68a;
        }
        .color-box.low {
          background: #bbf7d0;
        }
        .filing-steps {
          display: grid;
          gap: 10px;
        }
        .status-card {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          display: grid;
          gap: 8px;
        }
        .analysis-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .analysis-card {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          display: grid;
          gap: 6px;
        }
        .proof-status {
          font-weight: 600;
        }
        .state-table,
        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
        }
        .state-table th,
        .state-table td,
        .leaderboard-table th,
        .leaderboard-table td {
          padding: 10px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.12);
          text-align: left;
        }
        .tax-owed {
          color: #b91c1c;
          font-weight: 700;
        }
        .total-tax {
          color: #0f172a;
          font-weight: 800;
        }
        .alert-item {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          display: grid;
          gap: 8px;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>IFTA & Fuel Compliance Command Center</h1>
            <p style={{ color: "rgba(15,23,42,0.7)" }}>
              Live tracking, automatic calculations, and audit-proof recordkeeping for dump truck fleets.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ronyx-action">Review Alerts</button>
            <button className="ronyx-action">Compliance Reports</button>
            <button className="ronyx-action" onClick={() => loadDashboard(activeQuarter)}>
              Refresh
            </button>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <strong>⛽ IFTA & Fuel Tax Command Center</strong>
            <span>[{activeQuarter}: APR-JUN]</span>
          </div>
          <div style={{ marginTop: 10, color: "rgba(15,23,42,0.7)", display: "grid", gap: 4 }}>
            <span>Status: {summary.status}</span>
            <span>Projected: {summary.projected} | Potential audit risk: {summary.risk}</span>
            <span>⚠️ Alerts: {summary.alerts}</span>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h3>Quarterly Snapshot</h3>
          <div className="quarter-selector">
            {quarters.map((q) => (
              <button key={q} className={`q-btn ${activeQuarter === q ? "active" : ""}`} onClick={() => setActiveQuarter(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="snapshot-grid">
            <div className="metric-card">
              <div className="metric-value">{snapshot.totalMiles}</div>
              <div className="metric-label">TOTAL MILES</div>
              <div className="metric-sub">12 trucks, 42% TX, 28% LA, 20% AR, 10% OK</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{snapshot.gallons}</div>
              <div className="metric-label">GALLONS DIESEL</div>
              <div className="metric-sub">Avg: {snapshot.costPerGallon} | Total: {snapshot.fuelTotal}</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{snapshot.avgMpg}</div>
              <div className="metric-label">AVG MPG</div>
              <div className="metric-sub">{snapshot.bestWorst}</div>
            </div>
            <div className="metric-card critical">
              <div className="metric-value">{snapshot.taxOwed}</div>
              <div className="metric-label">EST. TAX OWED</div>
              <div className="metric-sub">Due: {snapshot.due}</div>
              <button className="ronyx-action primary" onClick={prepareReturn}>
                Prepare Return
              </button>
            </div>
          </div>
        </section>

        <section className="mobile-capture">
          <h3>📱 Daily Capture (Driver's Mobile View)</h3>
          <div className="capture-card">
            <div className="capture-header">
              <span>⛽</span>
              <strong>Fuel Purchase - Truck #12</strong>
            </div>
            <div className="capture-options">
              {[
                { title: "TAKE PHOTO OF RECEIPT", desc: "System reads gallons, price, date automatically", icon: "📸" },
                { title: "SYNC FUEL CARD PURCHASE", desc: "Auto-import from Comdata/WEX/EFS", icon: "💳" },
                { title: "MANUAL ENTRY", desc: "For cash purchases or backup", icon: "⌨️" },
              ].map((option) => (
                <div key={option.title} className="option-card" onClick={option.title.includes("SYNC") ? syncFuelCards : undefined}>
                  <div>{option.icon}</div>
                  <strong>{option.title}</strong>
                  <p>{option.desc}</p>
                </div>
              ))}
            </div>
            <div className="recent-captures">
              <h4>Today's Fuel (Truck #12):</h4>
              {dailyFuelCaptures.length === 0 ? (
                <div className="ronyx-row">No fuel captures logged today.</div>
              ) : (
                dailyFuelCaptures.map((capture) => (
                  <div key={capture} className="ronyx-row">{capture}</div>
                ))
              )}
            </div>
          </div>
          <div className="capture-card">
            <div className="capture-header">
              <span>📊</span>
              <strong>End-of-Day Mileage</strong>
            </div>
            <div className="mileage-form">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="metric-label">Truck #</label>
                  <select className="ronyx-action" style={{ width: "100%" }} value={dailyMileage.truck} onChange={(e) => setDailyMileage((prev) => ({ ...prev, truck: e.target.value }))}>
                    <option value="12">#12 - D. Perez</option>
                    <option value="18">#18 - S. Grant</option>
                    <option value="24">#24 - J. Lane</option>
                  </select>
                </div>
                <div>
                  <label className="metric-label">End Odometer</label>
                  <div className="odometer-input">
                    <input
                      className="ronyx-action"
                      style={{ flex: 1 }}
                      type="number"
                      value={dailyMileage.odometer}
                      onChange={(e) => setDailyMileage((prev) => ({ ...prev, odometer: Number(e.target.value) }))}
                    />
                    <button className="ronyx-action">Get from ELD</button>
                  </div>
                </div>
              </div>
              <div className="daily-summary">
                <div className="summary-item">
                  <span>Today's Miles:</span>
                  <strong>{dailyMileage.miles}</strong>
                </div>
                <div className="summary-item">
                  <span>By State:</span>
                  <strong>{dailyMileage.byState}</strong>
                </div>
                <div className="summary-item">
                  <span>Fuel Used:</span>
                  <strong>{dailyMileage.fuelUsed}</strong>
                </div>
              </div>
              <button className="ronyx-action primary" onClick={saveDailyMileage}>
                ✅ Save Daily Log
              </button>
            </div>
          </div>
        </section>

        <section className="receipt-processing">
          <h3>🧠 Smart Receipt Processing</h3>
          <div className="bulk-upload-zone">
            <div>📤 Drag & Drop Fuel Receipts</div>
            <div className="processing-steps">
              {[
                "OCR Scan — Read gallons, price, date",
                "Auto-Match — Link to truck/driver by date/time",
                "State Allocation — Assign to correct jurisdiction",
                "Error Check — Flag duplicates, missing data",
              ].map((step, index) => (
                <div key={step} className="step">
                  <span className="step-num">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <button className="ronyx-action primary" onClick={uploadFuelReceipts}>
              Select Files
            </button>
            <p>Supports: Photos, PDFs, even crumpled receipts</p>
          </div>
          <div className="processing-queue">
            <h4>Processing Queue (8 receipts)</h4>
            {processingQueue.length === 0 ? (
              <div className="ronyx-row">No receipts in queue.</div>
            ) : (
              processingQueue.map((item) => (
                <div key={item} className="ronyx-row">{item}</div>
              ))
            )}
          </div>
        </section>

        <section className="state-mileage-tracker">
          <h3>🗺️ State Mileage Tracker ({activeQuarter})</h3>
          <div className="ifta-map">
            <div className="map-container">
              {[
                { state: "TEXAS", miles: "18,200 mi", pct: "42.5%", tax: "$0.20/gal" },
                { state: "LOUISIANA", miles: "12,150 mi", pct: "28.3%", tax: "$0.20/gal" },
                { state: "ARKANSAS", miles: "8,570 mi", pct: "20.0%", tax: "$0.22/gal" },
                { state: "OKLAHOMA", miles: "4,930 mi", pct: "10.0%", tax: "$0.19/gal" },
              ].map((item) => (
                <div key={item.state} className="state-card">
                  <strong>{item.state}</strong>
                  <div>{item.miles}</div>
                  <div>{item.pct}</div>
                  <div>{item.tax}</div>
                </div>
              ))}
            </div>
            <div className="map-legend">
              <div className="legend-item"><span className="color-box high"></span>High Miles (&gt;10,000)</div>
              <div className="legend-item"><span className="color-box medium"></span>Medium (5,000-10,000)</div>
              <div className="legend-item"><span className="color-box low"></span>Low (&lt;5,000)</div>
            </div>
          </div>
          <table className="state-table">
            <thead>
              <tr>
                <th>STATE</th>
                <th>MILES</th>
                <th>% OF TOTAL</th>
                <th>GALLONS USED</th>
                <th>MPG</th>
                <th>TAX RATE</th>
                <th>TAX OWED/(CREDIT)</th>
                <th>PROOF OF MILES</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row) => (
                <tr key={row.state}>
                  <td><strong>{row.state}</strong></td>
                  <td>{row.miles}</td>
                  <td>{row.pct}</td>
                  <td>{row.gallons} gal</td>
                  <td>{row.mpg}</td>
                  <td>{row.taxRate}</td>
                  <td className={row.needsFix ? "tax-owed" : ""}>{row.tax}</td>
                  <td>
                    <span className="proof-status">{row.proof}</span>
                    {row.needsFix ? <button className="ronyx-action" style={{ marginLeft: 8 }}>Fix Gap</button> : null}
                  </td>
                </tr>
              ))}
              <tr>
                <td><strong>TOTAL {activeQuarter}</strong></td>
                <td>42,850</td>
                <td>100%</td>
                <td>6,425 gal</td>
                <td>6.67</td>
                <td>—</td>
                <td className="total-tax">+$3,850.18</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="audit-filing">
          <h3>📋 Audit Preparation & Filing</h3>
          <div className="filing-status">
            <div className="status-card">
              <strong>Q2 2024 — Draft</strong>
              <span>Due: July 31, 2024 (14 days)</span>
              <span>Progress: 85% complete</span>
            </div>
            <div className="status-card">
              <strong>Q1 2024 — Filed & Paid</strong>
              <span>Filed: April 30, 2024</span>
              <span>Confirmation: TX-IFTA-8845123</span>
              <span>Amount Paid: $3,420.15</span>
            </div>
          </div>
          <div className="audit-package">
            <h4>🚀 One-Click IFTA Filing</h4>
            <div className="filing-steps">
            <div className="ronyx-row">✅ Review calculations <button className="ronyx-action">Review</button></div>
            <div className="ronyx-row">✅ Generate IFTA forms (PDF) <button className="ronyx-action">Generate</button></div>
            <div className="ronyx-row">
              🔄 Submit to Texas IFTA portal <button className="ronyx-action primary" onClick={fileReturn}>File Online</button>
            </div>
            </div>
          </div>
          <div className="audit-package">
            <h4>🛡️ Audit Defense Package</h4>
          <button className="ronyx-action primary" onClick={generateAuditPackage}>
            Generate Audit Package
          </button>
            <ul>
              <li>All fuel receipts (OCR verified)</li>
              <li>ELD mileage logs with GPS verification</li>
              <li>State-by-state mileage allocation report</li>
              <li>Calculation worksheets with formulas</li>
              <li>Filing confirmation and payment records</li>
              <li>Cover letter with summary</li>
            </ul>
          </div>
        </section>

        <section className="performance-metrics">
          <h3>🚛 Truck & Driver Fuel Performance</h3>
          <div className="mpg-leaderboard">
            <h4>🏆 MPG Leaderboard ({activeQuarter})</h4>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>TRUCK</th>
                  <th>DRIVER</th>
                  <th>MPG</th>
                  <th>FUEL COST/MILE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {mpgRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No MPG data available.</td>
                  </tr>
                ) : (
                  mpgRows.map((row) => (
                    <tr key={`${row.rank}-${row.truck}`}>
                      <td>{row.rank}</td>
                      <td>{row.truck}</td>
                      <td>{row.driver}</td>
                      <td>{row.mpg}</td>
                      <td>{row.costPerMile}</td>
                      <td><button className="ronyx-action">{row.action}</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="fuel-analysis">
            <h4>💰 Fuel Cost Analysis</h4>
            <div className="analysis-cards">
              {analysisCards.length === 0 ? (
                <div className="analysis-card">No analysis available.</div>
              ) : (
                analysisCards.map((card) => (
                  <div key={card.title} className="analysis-card">
                    <div>{card.title}</div>
                    <strong>{card.value}</strong>
                    <span>{card.trend}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="compliance-alerts">
          <h3>🔔 IFTA Compliance Alerts</h3>
          {alerts.length === 0 ? (
            <div className="alert-item">No active alerts.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {alert.actions.map((action) => (
                    <button key={action} className="ronyx-action">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
