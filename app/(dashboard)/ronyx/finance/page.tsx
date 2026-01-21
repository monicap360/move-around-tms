"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ModuleRow = {
  title: string;
  subtitle: string;
  status: string;
};

export default function RonyxFinancePage() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/ronyx/modules?section=finance", { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
    } catch (err) {
      console.error("Failed to load finance rows", err);
      setRows([]);
      setStatusMessage("Unable to load finance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

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
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%),
            var(--ronyx-black);
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
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(29, 78, 216, 0.4);
          font-size: 0.8rem;
          color: #1d4ed8;
          background: rgba(29, 78, 216, 0.1);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Finance Command Center</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Cash flow visibility, settlements, and billing orchestration in one place.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="ronyx-action primary" href="/ronyx/financial">
              Open Financial Ops
            </Link>
            <Link className="ronyx-action" href="/ronyx/billing">
              Billing
            </Link>
            <Link className="ronyx-action" href="/ronyx/accounts-receivable">
              Accounts Receivable
            </Link>
            <button className="ronyx-action" onClick={loadRows}>
              Refresh
            </button>
          </div>
        </div>

        <section className="ronyx-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Cash On Hand", value: "$248,900", note: "Updated today" },
            { label: "Outstanding Invoices", value: "$42,110", note: "12 invoices open" },
            { label: "Settlement Queue", value: "8 batches", note: "3 need review" },
            { label: "Collections Risk", value: "Low", note: "2 overdue accounts" },
          ].map((card) => (
            <div key={card.label} className="ronyx-card">
              <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{card.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6 }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)", marginTop: 6 }}>{card.note}</div>
            </div>
          ))}
        </section>

        <section className="ronyx-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Finance Work Queue</h2>
            {statusMessage && <span style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.85rem" }}>{statusMessage}</span>}
          </div>
          {loading ? (
            <div className="ronyx-row">Loading finance pipeline...</div>
          ) : rows.length === 0 ? (
            <div className="ronyx-row">No finance items available yet.</div>
          ) : (
            rows.map((row) => (
              <div key={row.title} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>{row.subtitle}</div>
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1d4ed8" }}>{row.status}</div>
              </div>
            ))
          )}
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Financial Engineering Flow
          </h2>
          <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
            Revenue Enhancement Strategies
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Base Operations → Value-Added Services →
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {[
              "Supply chain consulting",
              "Logistics optimization as a service",
              "Technology licensing",
              "Training programs",
              "Industry benchmarking",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Revenue lever</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Cost Structure Optimization
          </h2>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Traditional Costs → Intelligent Optimization →
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Super Agent: Cost Slasher</div>
                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  Automated cost levers and vendor optimization
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {[
                "Fuel hedging strategies",
                "Insurance premium optimization",
                "Maintenance contract negotiation",
                "Technology cost benchmarking",
              ].map((item) => (
                <div key={item} className="ronyx-row">
                  <span>{item}</span>
                  <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Optimization lever</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Savings Reinvestment → Growth Acceleration
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            White-Glove Client Service
          </h2>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Premium Client → Dedicated Service Team →
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {[
              "24/7 VIP support",
              "Real-time shipment visibility",
              "Custom reporting",
              "Quarterly innovation sessions",
              "Annual value review",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Premium service</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            High-Value Load Protocol
          </h2>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            High-Value Shipment ($100k+) →
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {[
              "Enhanced security protocols",
              "Premium driver assignment",
              "Real-time executive updates",
              "Insurance optimization",
              "Post-delivery analysis & reporting",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Risk control</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Intelligent Automation Stack for Scale
          </h2>
          <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
            AI-Driven Decision Making Flow
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Data Streams → AI Processing Layer → Executive Decisions
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Predictive Analytics Engine</div>
                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  Forward-looking risk and demand signals.
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
            </div>
            {[
              "Demand forecasting (95% accuracy)",
              "Price prediction models",
              "Risk probability scoring",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Predictive</span>
              </div>
            ))}

            <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Prescriptive Analytics Engine</div>
                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  Scenario testing and optimized decisions.
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
            </div>
            {[
              "\"What-if\" scenario modeling",
              "Optimization recommendations",
              "ROI calculation for initiatives",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Prescriptive</span>
              </div>
            ))}

            <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Automated Execution Engine</div>
                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  Turn insights into action safely.
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
            </div>
            {[
              "Rule-based automation",
              "Exception handling",
              "Human escalation protocols",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Execution</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Executive Command Center Flow
          </h2>
          <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
            Owner-Manager Dashboard → Real-time Business Intelligence
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {[
              {
                title: "Financial Command",
                items: [
                  "Daily P&L Dashboard (6-figure tracking)",
                  "Cash Flow Heatmap",
                  "Margin Optimization Engine",
                  "Acquisition Target Analysis",
                ],
              },
              {
                title: "Operational Command",
                items: [
                  "Asset Utilization Radar",
                  "Driver Productivity Leaderboard",
                  "Route Efficiency Matrix",
                  "Capacity Forecasting Engine",
                ],
              },
              {
                title: "Growth Command",
                items: [
                  "Market Expansion Tracker",
                  "Client Portfolio Health",
                  "Competitive Intelligence",
                  "M&A Pipeline",
                ],
              },
              {
                title: "Risk Command",
                items: [
                  "Compliance Risk Score",
                  "Insurance Optimization",
                  "Fraud Detection AI",
                  "Business Continuity Dashboard",
                ],
              },
            ].map((group) => (
              <div key={group.title} className="ronyx-card" style={{ background: "#ffffff" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.title}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.items.map((item) => (
                    <div key={item} className="ronyx-row">
                      <span>{item}</span>
                      <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>
                        Command signal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Super Agents Integration Framework
          </h2>
          <div style={{ marginTop: 12, fontWeight: 700 }}>Super Agent Types</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {[
              "Revenue Agents",
              "Cost Optimization Agents",
              "Risk Management Agents",
              "Growth Agents",
              "Compliance Agents",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>Agent class</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Business Data → Agent Processing → Actionable Insights → Automated Execution
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Premium Operational Workflow
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="ronyx-card" style={{ background: "#ffffff" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Revenue Maximization Flow (7-Figure Focus)
              </div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>
                High-Value Load Acquisition → Dynamic Pricing Engine →
              </div>
              <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Super Agent: Revenue Optimizer</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                    Real-time rate intelligence + bid automation.
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {[
                  "Real-time spot market analysis",
                  "Predictive rate modeling",
                  "Shipper relationship scoring",
                  "Automated bid generation",
                ].map((item) => (
                  <div key={item} className="ronyx-row">
                    <span>{item}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>
                      Revenue lever
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                Premium Assignment → White-Glove Service → Max Margin Capture
              </div>
            </div>

            <div className="ronyx-card" style={{ background: "#ffffff" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Asset Hyper-Optimization Flow</div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Fleet Intelligence Platform →</div>
              <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Super Agent: Asset Maximizer</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                    Keep fleet uptime at peak profitability.
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {[
                  "Predictive maintenance (avoid 6-figure downtime)",
                  "Fuel optimization AI (saves $100k+/year)",
                  "Resale value optimization",
                  "Lease vs Buy analysis",
                ].map((item) => (
                  <div key={item} className="ronyx-row">
                    <span>{item}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>
                      Asset lever
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                Continuous Uptime → Maximum Utilization → Asset ROI 300%+
              </div>
            </div>

            <div className="ronyx-card" style={{ background: "#ffffff" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Driver Enterprise Management Flow
              </div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Elite Driver Program →</div>
              <div className="ronyx-row" style={{ background: "rgba(29, 78, 216, 0.08)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Super Agent: Talent Manager</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                    Retention, performance, and compliance assurance.
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Active</span>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {[
                  "Performance-based compensation models",
                  "Retention prediction & intervention",
                  "Training ROI analysis",
                  "Succession planning for key roles",
                ].map((item) => (
                  <div key={item} className="ronyx-row">
                    <span>{item}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>
                      Talent lever
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                95% Retention → 25%+ Productivity → Zero DOT Issues
              </div>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}>
            Super Agents Operational Matrix
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              {
                title: "Margin Guardian",
                function: "Protects 30%+ gross margins",
                flow:
                  "Real-time Costs + Market Rates → Margin Analysis → Alert + Rate Renegotiation + Alternative Carrier + Route Re-optimization",
                actions: [
                  "Alert: Margin dropping below threshold",
                  "Action: Automated rate renegotiation",
                  "Action: Alternative carrier sourcing",
                  "Action: Route re-optimization",
                ],
              },
              {
                title: "Cash Flow Accelerator",
                function: "Optimizes working capital",
                flow:
                  "AR Aging + Payment Terms → Cash Flow Engine → Follow-up + Discounts + Early Pay + AP Timing",
                actions: [
                  "Automated invoice follow-up",
                  "Dynamic discount offering",
                  "Early payment optimization",
                  "AP timing optimization",
                ],
              },
              {
                title: "Acquisition Scout",
                function: "Identifies M&A opportunities",
                flow:
                  "Market Data + Financial Models → Target Scoring → Identify Fleets + Synergy Value + Pricing + Integration",
                actions: [
                  "Identify underperforming fleets",
                  "Calculate synergy value",
                  "Acquisition pricing model",
                  "Integration roadmap",
                ],
              },
              {
                title: "Compliance Sentinel",
                function: "Zero-violation compliance",
                flow:
                  "Regulatory Data + Operations → Compliance Shield → Pre-Audit + Prevention + Automation + Penalty Avoidance",
                actions: [
                  "Pre-audit simulation",
                  "Real-time violation prevention",
                  "Documentation automation",
                  "Penalty avoidance scoring",
                ],
              },
            ].map((agent) => (
              <div key={agent.title} className="ronyx-card" style={{ background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{agent.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                      Function: {agent.function}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1d4ed8" }}>Operational</span>
                </div>
                <div style={{ marginTop: 8, fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  Flow: {agent.flow}
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {agent.actions.map((item) => (
                    <div key={item} className="ronyx-row">
                      <span>{item}</span>
                      <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.55)" }}>
                        Auto-action
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
