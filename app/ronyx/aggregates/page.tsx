"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RateCard = {
  id: string;
  customer: string;
  rateName: string;
  structure: string;
  basePrice: string;
  effective: string;
  method: "hour" | "mile" | "load";
  baseRate: string;
  materialSurcharges: { material: string; surcharge: string }[];
  fuelLinked: boolean;
  fuelPct: string;
  detentionFreeMinutes: string;
  detentionRate: string;
  notes: string;
};

type JobSite = {
  id: string;
  name: string;
  location: string;
  contactName: string;
  contactPhone: string;
  hours: string;
  accessNotes: string;
  unloadInstructions: string;
  history: string;
  alerts: string;
  rating: string;
  ratingNote: string;
  gps: string;
};

const sampleRateCards: RateCard[] = [
  {
    id: "rate-1",
    customer: "Jones Const",
    rateName: "Jones Const - Main St Project",
    structure: "$85/hr + $15/ton mat",
    basePrice: "$85.00 / hour",
    effective: "01/01/24",
    method: "hour",
    baseRate: "85",
    materialSurcharges: [
      { material: '3/4" Clean Rock', surcharge: "15" },
      { material: "Wet Clay", surcharge: "30" },
    ],
    fuelLinked: true,
    fuelPct: "3.5",
    detentionFreeMinutes: "45",
    detentionRate: "75",
    notes: "Rate locked through Dec 2024.",
  },
  {
    id: "rate-2",
    customer: "City Project",
    rateName: "City Project - Highway",
    structure: "$4.25/mi loaded, $3.00/mi empty",
    basePrice: "$4.25 / mile",
    effective: "02/15/24",
    method: "mile",
    baseRate: "4.25",
    materialSurcharges: [],
    fuelLinked: false,
    fuelPct: "0",
    detentionFreeMinutes: "30",
    detentionRate: "60",
    notes: "City project pricing.",
  },
  {
    id: "rate-3",
    customer: "Thompson Co",
    rateName: "Thompson Co - Fuel Index",
    structure: "10% over fuel index",
    basePrice: "Variable",
    effective: "03/01/24",
    method: "load",
    baseRate: "0",
    materialSurcharges: [],
    fuelLinked: true,
    fuelPct: "10",
    detentionFreeMinutes: "60",
    detentionRate: "80",
    notes: "Variable pricing based on fuel index.",
  },
];

const sampleSites: JobSite[] = [
  {
    id: "site-1",
    name: "Riverside Apts",
    location: "2500 River Rd",
    contactName: "Bob (Foreman)",
    contactPhone: "555-0123",
    hours: "Mon-Fri, 7am-3pm",
    accessNotes: "Call before arrival.",
    unloadInstructions: "Unload NE of crane.",
    history: "4/12, 4/15, 4/18, 4/22, 4/30",
    alerts: "⚠️ GATE CLOSES 3PM",
    rating: "3",
    ratingNote: "Slow to sign tickets.",
    gps: "32.7765° N, 96.7969° W",
  },
  {
    id: "site-2",
    name: "Main St Project",
    location: "1500 Main St",
    contactName: "Site Lead",
    contactPhone: "555-0199",
    hours: "Mon-Sat, 6am-5pm",
    accessNotes: "Use South gate.",
    unloadInstructions: "Dump in marked area.",
    history: "4/10, 4/12, 4/14, 4/17, 4/19",
    alerts: "✅ Good site",
    rating: "4",
    ratingNote: "Fast turnaround.",
    gps: "32.7791° N, 96.8001° W",
  },
  {
    id: "site-3",
    name: "Oakridge Subdiv.",
    location: "HWY 45 & Oak",
    contactName: "Dispatch Desk",
    contactPhone: "555-0110",
    hours: "Mon-Fri, 8am-4pm",
    accessNotes: "Call 1hr before arrival.",
    unloadInstructions: "Dump at staging area.",
    history: "4/02, 4/05, 4/08, 4/11, 4/16",
    alerts: "🔴 NO DELIVERIES FRI",
    rating: "2",
    ratingNote: "Gate delays.",
    gps: "32.7720° N, 96.7920° W",
  },
];

export default function RonyxAggregatesPage() {
  const [activeTab, setActiveTab] = useState<"rates" | "sites" | "quote">("rates");
  const [rateCards, setRateCards] = useState<RateCard[]>(sampleRateCards);
  const [jobSites, setJobSites] = useState<JobSite[]>(sampleSites);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(sampleRateCards[0]?.id || null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(sampleSites[0]?.id || null);
  const [quote, setQuote] = useState({
    from: "Pit 7",
    to: "Riverside Apts",
    distance: "14",
    material: "Clean Fill",
    loadHours: "1.5",
    customer: "Jones Const",
  });

  const selectedRate = rateCards.find((card) => card.id === selectedRateId) || rateCards[0];
  const selectedSite = jobSites.find((site) => site.id === selectedSiteId) || jobSites[0];

  const quoteTotals = useMemo(() => {
    const distance = Number(quote.distance || 0);
    const hours = Number(quote.loadHours || 0);
    const fuelPct = Number(selectedRate?.fuelPct || 0);
    const haulRate = selectedRate?.method === "mile" ? Number(selectedRate.baseRate || 0) : 0;
    const hourlyRate = selectedRate?.method === "hour" ? Number(selectedRate.baseRate || 0) : 0;
    const haulCharge = distance * haulRate;
    const timeCharge = hours * hourlyRate;
    const baseTotal = haulCharge + timeCharge;
    const fuelCharge = baseTotal * (fuelPct / 100);
    const total = baseTotal + fuelCharge;
    return { haulCharge, timeCharge, fuelCharge, total };
  }, [quote, selectedRate]);

  const updateRateField = (field: keyof RateCard, value: string | boolean) => {
    if (!selectedRate) return;
    setRateCards((prev) =>
      prev.map((card) => (card.id === selectedRate.id ? { ...card, [field]: value } : card)),
    );
  };

  const updateSurcharge = (index: number, field: "material" | "surcharge", value: string) => {
    if (!selectedRate) return;
    const updated = selectedRate.materialSurcharges.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    updateRateField("materialSurcharges", updated);
  };

  const addSurcharge = () => {
    if (!selectedRate) return;
    updateRateField("materialSurcharges", [...selectedRate.materialSurcharges, { material: "", surcharge: "" }]);
  };

  const updateSiteField = (field: keyof JobSite, value: string) => {
    if (!selectedSite) return;
    setJobSites((prev) =>
      prev.map((site) => (site.id === selectedSite.id ? { ...site, [field]: value } : site)),
    );
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
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-row {
          display: grid;
          grid-template-columns: 24px repeat(5, minmax(120px, 1fr));
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
        .ronyx-input:focus,
        .ronyx-input:focus-visible {
          outline: none;
          border-color: rgba(29, 78, 216, 0.6);
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-textarea {
          width: 100%;
          min-height: 90px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          resize: vertical;
        }
        .ronyx-tab {
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: rgba(29, 78, 216, 0.06);
          padding: 8px 16px;
          font-weight: 600;
        }
        .ronyx-tab.active {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(29, 78, 216, 0.08);
          color: var(--ronyx-accent);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .ronyx-table {
          display: grid;
          gap: 10px;
        }
        .ronyx-panel {
          border-left: 2px solid rgba(29, 78, 216, 0.2);
          padding-left: 16px;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Rates & Job Sites Hub</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Live pricing and location intelligence for your hauling business.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <button className={`ronyx-tab ${activeTab === "rates" ? "active" : ""}`} onClick={() => setActiveTab("rates")}>
            Customer Rates
          </button>
          <button className={`ronyx-tab ${activeTab === "sites" ? "active" : ""}`} onClick={() => setActiveTab("sites")}>
            Job Site Directory
          </button>
          <button className={`ronyx-tab ${activeTab === "quote" ? "active" : ""}`} onClick={() => setActiveTab("quote")}>
            Quick Quote
          </button>
        </section>

        {activeTab === "rates" && (
          <section className="ronyx-grid">
            <div className="ronyx-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Customer Rate Cards</h2>
                <button className="ronyx-action">+ Add New Rate Card</button>
              </div>
              <div className="ronyx-table">
                <div className="ronyx-row" style={{ fontWeight: 700 }}>
                  <span />
                  <span>Customer</span>
                  <span>Rate Structure</span>
                  <span>Base Price</span>
                  <span>Effective</span>
                  <span>Actions</span>
                </div>
                {rateCards.map((card) => (
                  <div key={card.id} className="ronyx-row">
                    <span>•</span>
                    <span>{card.customer}</span>
                    <span>{card.structure}</span>
                    <span>{card.basePrice}</span>
                    <span>{card.effective}</span>
                    <span>
                      <button className="ronyx-action" onClick={() => setSelectedRateId(card.id)}>
                        Edit
                      </button>
                      <button className="ronyx-action" style={{ marginLeft: 8 }}>
                        Deactivate
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedRate && (
              <div className="ronyx-card ronyx-panel">
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Edit Rate Card</h3>
                <div className="ronyx-grid" style={{ rowGap: 16 }}>
                  <div>
                    <label className="ronyx-label">Rate Name</label>
                    <input
                      className="ronyx-input"
                      value={selectedRate.rateName}
                      onChange={(e) => updateRateField("rateName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ronyx-label">Calculation Method</label>
                    <select
                      className="ronyx-input"
                      value={selectedRate.method}
                      onChange={(e) => updateRateField("method", e.target.value)}
                    >
                      <option value="hour">Per Hour</option>
                      <option value="mile">Per Mile</option>
                      <option value="load">Fixed per Load</option>
                    </select>
                  </div>
                  <div>
                    <label className="ronyx-label">Base Rate</label>
                    <input
                      className="ronyx-input"
                      value={selectedRate.baseRate}
                      onChange={(e) => updateRateField("baseRate", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ronyx-label">Fuel Surcharge</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedRate.fuelLinked}
                          onChange={(e) => updateRateField("fuelLinked", e.target.checked)}
                        />
                        Link to DOE Index
                      </label>
                      <input
                        className="ronyx-input"
                        style={{ maxWidth: 120 }}
                        value={selectedRate.fuelPct}
                        onChange={(e) => updateRateField("fuelPct", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ronyx-label">Detention</label>
                    <input
                      className="ronyx-input"
                      placeholder="Free minutes"
                      value={selectedRate.detentionFreeMinutes}
                      onChange={(e) => updateRateField("detentionFreeMinutes", e.target.value)}
                    />
                    <input
                      className="ronyx-input"
                      style={{ marginTop: 8 }}
                      placeholder="Rate after"
                      value={selectedRate.detentionRate}
                      onChange={(e) => updateRateField("detentionRate", e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4>Material Surcharges</h4>
                    <button className="ronyx-action" onClick={addSurcharge}>
                      + Add
                    </button>
                  </div>
                  {selectedRate.materialSurcharges.map((item, index) => (
                    <div key={`${selectedRate.id}-surcharge-${index}`} style={{ marginTop: 10 }}>
                      <input
                        className="ronyx-input"
                        placeholder="Material"
                        value={item.material}
                        onChange={(e) => updateSurcharge(index, "material", e.target.value)}
                      />
                      <input
                        className="ronyx-input"
                        style={{ marginTop: 8 }}
                        placeholder="Surcharge"
                        value={item.surcharge}
                        onChange={(e) => updateSurcharge(index, "surcharge", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <label className="ronyx-label">Notes</label>
                  <textarea
                    className="ronyx-textarea"
                    value={selectedRate.notes}
                    onChange={(e) => updateRateField("notes", e.target.value)}
                  />
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button className="ronyx-action">Save Rate Card</button>
                  <button className="ronyx-action">Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "sites" && (
          <section className="ronyx-grid">
            <div className="ronyx-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Job Site Directory</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ronyx-action">+ New Site</button>
                  <button className="ronyx-action">Map View</button>
                </div>
              </div>
              <div className="ronyx-table">
                <div className="ronyx-row" style={{ fontWeight: 700 }}>
                  <span />
                  <span>Site Name</span>
                  <span>Location</span>
                  <span>Key Info & Alerts</span>
                  <span />
                  <span />
                </div>
                {jobSites.map((site) => (
                  <div key={site.id} className="ronyx-row">
                    <span>•</span>
                    <span>{site.name}</span>
                    <span>{site.location}</span>
                    <span>
                      {site.alerts}
                      <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{site.contactName}</div>
                    </span>
                    <span />
                    <span>
                      <button className="ronyx-action" onClick={() => setSelectedSiteId(site.id)}>
                        View
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedSite && (
              <div className="ronyx-card ronyx-panel">
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>{selectedSite.name}</h3>
                <div className="ronyx-grid" style={{ rowGap: 14 }}>
                  <div>
                    <label className="ronyx-label">Full Address</label>
                    <input className="ronyx-input" value={selectedSite.location} onChange={(e) => updateSiteField("location", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">Site Contact</label>
                    <input className="ronyx-input" value={selectedSite.contactName} onChange={(e) => updateSiteField("contactName", e.target.value)} />
                    <input className="ronyx-input" style={{ marginTop: 8 }} value={selectedSite.contactPhone} onChange={(e) => updateSiteField("contactPhone", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">Hours & Access</label>
                    <input className="ronyx-input" value={selectedSite.hours} onChange={(e) => updateSiteField("hours", e.target.value)} />
                    <input className="ronyx-input" style={{ marginTop: 8 }} value={selectedSite.accessNotes} onChange={(e) => updateSiteField("accessNotes", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">Unload Instructions</label>
                    <textarea className="ronyx-textarea" value={selectedSite.unloadInstructions} onChange={(e) => updateSiteField("unloadInstructions", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">History</label>
                    <input className="ronyx-input" value={selectedSite.history} onChange={(e) => updateSiteField("history", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">Site Rating</label>
                    <input className="ronyx-input" value={selectedSite.rating} onChange={(e) => updateSiteField("rating", e.target.value)} />
                    <input className="ronyx-input" style={{ marginTop: 8 }} value={selectedSite.ratingNote} onChange={(e) => updateSiteField("ratingNote", e.target.value)} />
                  </div>
                  <div>
                    <label className="ronyx-label">GPS Location</label>
                    <input className="ronyx-input" value={selectedSite.gps} onChange={(e) => updateSiteField("gps", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button className="ronyx-action">Save Site</button>
                  <button className="ronyx-action">Clone for New Project</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "quote" && (
          <section className="ronyx-card">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Quick Hauling Quote</h2>
            <div className="ronyx-grid" style={{ rowGap: 20 }}>
              <div>
                <label className="ronyx-label">From</label>
                <input className="ronyx-input" value={quote.from} onChange={(e) => setQuote((prev) => ({ ...prev, from: e.target.value }))} />
              </div>
              <div>
                <label className="ronyx-label">To</label>
                <input className="ronyx-input" value={quote.to} onChange={(e) => setQuote((prev) => ({ ...prev, to: e.target.value }))} />
              </div>
              <div>
                <label className="ronyx-label">Distance (mi)</label>
                <input className="ronyx-input" value={quote.distance} onChange={(e) => setQuote((prev) => ({ ...prev, distance: e.target.value }))} />
              </div>
              <div>
                <label className="ronyx-label">Material</label>
                <input className="ronyx-input" value={quote.material} onChange={(e) => setQuote((prev) => ({ ...prev, material: e.target.value }))} />
              </div>
              <div>
                <label className="ronyx-label">Est. Load/Unload (hrs)</label>
                <input className="ronyx-input" value={quote.loadHours} onChange={(e) => setQuote((prev) => ({ ...prev, loadHours: e.target.value }))} />
              </div>
              <div>
                <label className="ronyx-label">Customer</label>
                <input className="ronyx-input" value={quote.customer} onChange={(e) => setQuote((prev) => ({ ...prev, customer: e.target.value }))} />
              </div>
            </div>
            <div className="ronyx-card" style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Live Price Breakdown
              </div>
              <div className="ronyx-row">
                <span>Hauling ({quote.distance} mi @ {selectedRate?.baseRate}/mi)</span>
                <span>${quoteTotals.haulCharge.toFixed(2)}</span>
              </div>
              <div className="ronyx-row">
                <span>Load/Unload ({quote.loadHours} hrs @ {selectedRate?.baseRate}/hr)</span>
                <span>${quoteTotals.timeCharge.toFixed(2)}</span>
              </div>
              <div className="ronyx-row">
                <span>Fuel Surcharge ({selectedRate?.fuelPct || "0"}%)</span>
                <span>${quoteTotals.fuelCharge.toFixed(2)}</span>
              </div>
              <div className="ronyx-row" style={{ fontWeight: 700 }}>
                <span>Quote Total</span>
                <span>${quoteTotals.total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button className="ronyx-action">Create Load & Ticket</button>
                <button className="ronyx-action">Copy Quote</button>
                <button className="ronyx-action">Email to Customer</button>
              </div>
            </div>
          </section>
        )}

        <section className="ronyx-grid" style={{ marginTop: 20 }}>
          <div className="ronyx-card">
            <h3 style={{ marginBottom: 8 }}>Most Profitable Customers (This Month)</h3>
            <div>Jones Const ($12,850)</div>
            <div>City Project ($9,200)</div>
          </div>
          <div className="ronyx-card">
            <h3 style={{ marginBottom: 8 }}>Top Job Sites by Volume</h3>
            <div>Main St (85 loads)</div>
            <div>Riverside (42 loads)</div>
          </div>
          <div className="ronyx-card">
            <h3 style={{ marginBottom: 8 }}>Rate Expiration Alerts</h3>
            <div>2 rate cards expire in next 30 days.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
