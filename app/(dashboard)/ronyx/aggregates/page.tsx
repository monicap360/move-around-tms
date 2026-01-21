"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";

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
  minimumCharge: string;
  notes: string;
  status?: string;
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
  status?: string;
};

const emptyRateCard: RateCard = {
  id: "",
  customer: "",
  rateName: "",
  structure: "",
  basePrice: "",
  effective: "",
  method: "hour",
  baseRate: "",
  materialSurcharges: [],
  fuelLinked: false,
  fuelPct: "",
  detentionFreeMinutes: "",
  detentionRate: "",
  minimumCharge: "",
  notes: "",
  status: "active",
};

const emptyJobSite: JobSite = {
  id: "",
  name: "",
  location: "",
  contactName: "",
  contactPhone: "",
  hours: "",
  accessNotes: "",
  unloadInstructions: "",
  history: "",
  alerts: "",
  rating: "3",
  ratingNote: "",
  gps: "",
  status: "active",
};

export default function RonyxAggregatesPage() {
  const [activeTab, setActiveTab] = useState<"rates" | "sites" | "quote">("rates");
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [rateMessage, setRateMessage] = useState("");
  const [siteMessage, setSiteMessage] = useState("");
  const [quote, setQuote] = useState({
    from: "Pit 7",
    to: "Riverside Apts",
    distance: "14",
    material: "Clean Fill",
    loadHours: "1.5",
    customer: "Jones Const",
  });
  const [quoteMessage, setQuoteMessage] = useState("");

  const selectedRate = rateCards.find((card) => card.id === selectedRateId);
  const selectedSite = jobSites.find((site) => site.id === selectedSiteId);

  const loadRateCards = useCallback(async () => {
    try {
      const res = await fetch("/api/ronyx/rate-cards", { cache: "no-store" });
      const data = await res.json();
      const cards = (data.rateCards || []).map(mapRateCardFromDb);
      setRateCards(cards);
      setSelectedRateId(cards[0]?.id || null);
    } catch {
      setRateCards([]);
    }
  }, []);

  const loadJobSites = useCallback(async () => {
    try {
      const res = await fetch("/api/ronyx/job-sites", { cache: "no-store" });
      const data = await res.json();
      const sites = (data.jobSites || []).map(mapJobSiteFromDb);
      setJobSites(sites);
      setSelectedSiteId(sites[0]?.id || null);
    } catch {
      setJobSites([]);
    }
  }, []);

  useEffect(() => {
    void loadRateCards();
    void loadJobSites();
  }, [loadRateCards, loadJobSites]);

  function mapRateCardFromDb(card: any): RateCard {
    return {
      id: card.id,
      customer: card.customer_name || "",
      rateName: card.rate_name || "",
      structure: card.structure || "",
      basePrice: card.base_price || "",
      effective: card.effective_date ? String(card.effective_date).slice(0, 10) : "",
      method: card.method || "hour",
      baseRate: card.base_rate?.toString() || "",
      materialSurcharges: card.material_surcharges || [],
      fuelLinked: Boolean(card.fuel_linked),
      fuelPct: card.fuel_pct?.toString() || "",
      detentionFreeMinutes: card.detention_free_minutes?.toString() || "",
      detentionRate: card.detention_rate?.toString() || "",
      minimumCharge: card.minimum_charge?.toString() || "",
      notes: card.notes || "",
      status: card.status || "active",
    };
  }

  function mapRateCardToDb(card: RateCard) {
    const isTemp = card.id.startsWith("temp-");
    return {
      id: !isTemp && card.id ? card.id : undefined,
      customer_name: card.customer,
      rate_name: card.rateName,
      structure: card.structure,
      base_price: card.basePrice,
      effective_date: card.effective ? new Date(card.effective).toISOString().slice(0, 10) : null,
      method: card.method,
      base_rate: card.baseRate,
      material_surcharges: card.materialSurcharges,
      fuel_linked: card.fuelLinked,
      fuel_pct: card.fuelPct,
      detention_free_minutes: card.detentionFreeMinutes,
      detention_rate: card.detentionRate,
      minimum_charge: card.minimumCharge,
      notes: card.notes,
      status: card.status || "active",
    };
  }

  function mapJobSiteFromDb(site: any): JobSite {
    return {
      id: site.id,
      name: site.site_name || "",
      location: site.location || "",
      contactName: site.contact_name || "",
      contactPhone: site.contact_phone || "",
      hours: site.hours || "",
      accessNotes: site.access_notes || "",
      unloadInstructions: site.unload_instructions || "",
      history: site.history || "",
      alerts: site.alerts || "",
      rating: site.rating?.toString() || "3",
      ratingNote: site.rating_note || "",
      gps: site.gps || "",
      status: site.status || "active",
    };
  }

  function mapJobSiteToDb(site: JobSite) {
    const isTemp = site.id.startsWith("temp-");
    return {
      id: !isTemp && site.id ? site.id : undefined,
      site_name: site.name,
      location: site.location,
      contact_name: site.contactName,
      contact_phone: site.contactPhone,
      hours: site.hours,
      access_notes: site.accessNotes,
      unload_instructions: site.unloadInstructions,
      history: site.history,
      alerts: site.alerts,
      rating: site.rating,
      rating_note: site.ratingNote,
      gps: site.gps,
      status: site.status || "active",
    };
  }

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
    const minimumCharge = Number(selectedRate?.minimumCharge || 0);
    const total = Math.max(baseTotal + fuelCharge, minimumCharge || 0);
    return { haulCharge, timeCharge, fuelCharge, total, minimumCharge };
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

  async function saveRateCard() {
    if (!selectedRate) return;
    setRateMessage("");
    const payload = mapRateCardToDb(selectedRate);
    const res = await fetch("/api/ronyx/rate-cards", {
      method: payload.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setRateMessage("Save failed.");
      return;
    }
    const data = await res.json();
    const saved = mapRateCardFromDb(data.rateCard);
    setRateCards((prev) => {
      const exists = prev.some((card) => card.id === saved.id);
      return exists ? prev.map((card) => (card.id === saved.id ? saved : card)) : [saved, ...prev];
    });
    setSelectedRateId(saved.id);
    setRateMessage("Saved.");
  }

  async function saveJobSite() {
    if (!selectedSite) return;
    setSiteMessage("");
    const payload = mapJobSiteToDb(selectedSite);
    const res = await fetch("/api/ronyx/job-sites", {
      method: payload.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setSiteMessage("Save failed.");
      return;
    }
    const data = await res.json();
    const saved = mapJobSiteFromDb(data.jobSite);
    setJobSites((prev) => {
      const exists = prev.some((site) => site.id === saved.id);
      return exists ? prev.map((site) => (site.id === saved.id ? saved : site)) : [saved, ...prev];
    });
    setSelectedSiteId(saved.id);
    setSiteMessage("Saved.");
  }

  function addRateCard() {
    const newCard = { ...emptyRateCard, id: `temp-${Date.now()}`, customer: "New Customer", rateName: "New Rate Card" };
    setRateCards((prev) => [newCard, ...prev]);
    setSelectedRateId(newCard.id);
    setRateMessage("Fill details and save.");
  }

  function addJobSite() {
    const newSite = { ...emptyJobSite, id: `temp-${Date.now()}`, name: "New Site" };
    setJobSites((prev) => [newSite, ...prev]);
    setSelectedSiteId(newSite.id);
    setSiteMessage("Fill details and save.");
  }

  const updateSiteField = (field: keyof JobSite, value: string) => {
    if (!selectedSite) return;
    setJobSites((prev) =>
      prev.map((site) => (site.id === selectedSite.id ? { ...site, [field]: value } : site)),
    );
  };

  async function handleCreateLoadFromQuote() {
    if (!quote.customer || !quote.to || !quote.from) {
      setQuoteMessage("Add customer, from, and site.");
      return;
    }
    setQuoteMessage("");
    const loadNumber = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
    const loadPayload = {
      load_number: loadNumber,
      route: `${quote.from} → ${quote.to}`,
      status: "available",
      customer_name: quote.customer,
      job_site: quote.to,
      material: quote.material,
      quantity: 1,
      unit_type: "Load",
      rate_type: selectedRate?.method || "per_load",
      rate_amount: quoteTotals.total,
      pickup_location: quote.from,
      delivery_location: quote.to,
    };
    const loadRes = await fetch("/api/ronyx/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loadPayload),
    });
    if (!loadRes.ok) {
      setQuoteMessage("Failed to create load.");
      return;
    }
    const loadData = await loadRes.json();
    const ticketRes = await fetch("/api/ronyx/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_number: loadNumber,
        ticket_date: new Date().toISOString().slice(0, 10),
        customer_name: quote.customer,
        delivery_location: quote.to,
        pickup_location: quote.from,
        material: quote.material,
        quantity: 1,
        unit_type: "Load",
        bill_rate: quoteTotals.total,
        status: "pending",
        payment_status: "unpaid",
      }),
    });
    if (ticketRes.ok) {
      const ticketData = await ticketRes.json();
      if (ticketData.ticket?.id && loadData.load?.id) {
        await fetch("/api/ronyx/loads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: loadData.load.id, ticket_id: ticketData.ticket.id }),
        });
      }
    }
    setQuoteMessage("Load and ticket created.");
  }

  async function handleCopyQuote() {
    const text = `Quote for ${quote.customer}: ${quote.from} → ${quote.to} | Total $${quoteTotals.total.toFixed(2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setQuoteMessage("Quote copied.");
    } catch {
      setQuoteMessage("Copy failed.");
    }
  }

  function handleEmailQuote() {
    const subject = encodeURIComponent(`Hauling Quote for ${quote.customer}`);
    const body = encodeURIComponent(
      `Route: ${quote.from} → ${quote.to}\nMaterial: ${quote.material}\nTotal: $${quoteTotals.total.toFixed(2)}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function cloneRateCard(card: RateCard) {
    const payload = mapRateCardToDb({
      ...card,
      id: "",
      customer: `${card.customer} (Copy)`,
      rateName: `${card.rateName} Copy`,
    });
    const res = await fetch("/api/ronyx/rate-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setRateMessage("Copy failed.");
      return;
    }
    const data = await res.json();
    const saved = mapRateCardFromDb(data.rateCard);
    setRateCards((prev) => [saved, ...prev]);
    setSelectedRateId(saved.id);
    setRateMessage("Copied.");
  }

  async function toggleRateCardStatus(card: RateCard) {
    const nextStatus = card.status === "inactive" ? "active" : "inactive";
    setRateCards((prev) => prev.map((item) => (item.id === card.id ? { ...item, status: nextStatus } : item)));
    if (selectedRate?.id === card.id) updateRateField("status", nextStatus);
    if (!card.id.startsWith("temp-")) {
      await fetch("/api/ronyx/rate-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, status: nextStatus }),
      });
    }
  }

  async function cloneJobSite(site: JobSite) {
    const payload = mapJobSiteToDb({ ...site, id: "", name: `${site.name} Copy` });
    const res = await fetch("/api/ronyx/job-sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setSiteMessage("Copy failed.");
      return;
    }
    const data = await res.json();
    const saved = mapJobSiteFromDb(data.jobSite);
    setJobSites((prev) => [saved, ...prev]);
    setSelectedSiteId(saved.id);
    setSiteMessage("Copied.");
  }

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
        .row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .row-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .row-actions .ronyx-action {
            width: 100%;
            margin-left: 0 !important;
          }
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
                <button className="ronyx-action" onClick={addRateCard}>+ Add New Rate Card</button>
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
                    <span className="row-actions">
                      <button className="ronyx-action" onClick={() => setSelectedRateId(card.id)}>
                        Edit
                      </button>
                      <button className="ronyx-action" style={{ marginLeft: 8 }} onClick={() => toggleRateCardStatus(card)}>
                        {card.status === "inactive" ? "Activate" : "Deactivate"}
                      </button>
                      <button className="ronyx-action" style={{ marginLeft: 8 }} onClick={() => cloneRateCard(card)}>
                        Clone
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
                    <label className="ronyx-label">Rate Structure</label>
                    <input
                      className="ronyx-input"
                      value={selectedRate.structure}
                      onChange={(e) => updateRateField("structure", e.target.value)}
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
                    <label className="ronyx-label">Base Price Label</label>
                    <input
                      className="ronyx-input"
                      value={selectedRate.basePrice}
                      onChange={(e) => updateRateField("basePrice", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ronyx-label">Effective Date</label>
                    <input
                      type="date"
                      className="ronyx-input"
                      value={selectedRate.effective}
                      onChange={(e) => updateRateField("effective", e.target.value)}
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
                  <div>
                    <label className="ronyx-label">Minimum Charge</label>
                    <input
                      className="ronyx-input"
                      placeholder="170"
                      value={selectedRate.minimumCharge}
                      onChange={(e) => updateRateField("minimumCharge", e.target.value)}
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
                <div style={{ marginTop: 16 }} className="row-actions">
                  <button className="ronyx-action" onClick={saveRateCard}>Save Rate Card</button>
                  <button className="ronyx-action" onClick={() => setSelectedRateId(null)}>Cancel</button>
                  {rateMessage && <span className="ronyx-label">{rateMessage}</span>}
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
                <div className="row-actions">
                  <button className="ronyx-action" onClick={addJobSite}>+ New Site</button>
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
                    <span className="row-actions">
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
                <div style={{ marginTop: 16 }} className="row-actions">
                  <button className="ronyx-action" onClick={saveJobSite}>Save Site</button>
                  <button className="ronyx-action" onClick={() => selectedSite && cloneJobSite(selectedSite)}>Clone for New Project</button>
                  {siteMessage && <span className="ronyx-label">{siteMessage}</span>}
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
                <select
                  className="ronyx-input"
                  value={quote.to}
                  onChange={(e) => {
                    setQuote((prev) => ({ ...prev, to: e.target.value }));
                    const match = jobSites.find((site) => site.name === e.target.value);
                    if (match) setSelectedSiteId(match.id);
                  }}
                >
                  <option value="">Select job site</option>
                  {jobSites.map((site) => (
                    <option key={site.id} value={site.name}>
                      {site.name}
                    </option>
                  ))}
                </select>
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
                <select
                  className="ronyx-input"
                  value={quote.customer}
                  onChange={(e) => {
                    setQuote((prev) => ({ ...prev, customer: e.target.value }));
                    const match = rateCards.find((card) => card.customer === e.target.value);
                    if (match) setSelectedRateId(match.id);
                  }}
                >
                  <option value="">Select customer</option>
                  {rateCards.map((card) => (
                    <option key={card.id} value={card.customer}>
                      {card.customer}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ronyx-card" style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Live Price Breakdown
              </div>
              <div className="ronyx-row">
                <span>Hauling ({quote.distance} mi @ {selectedRate?.baseRate || "0"}/mi)</span>
                <span>${quoteTotals.haulCharge.toFixed(2)}</span>
              </div>
              <div className="ronyx-row">
                <span>Load/Unload ({quote.loadHours} hrs @ {selectedRate?.baseRate || "0"}/hr)</span>
                <span>${quoteTotals.timeCharge.toFixed(2)}</span>
              </div>
              <div className="ronyx-row">
                <span>Fuel Surcharge ({selectedRate?.fuelPct || "0"}%)</span>
                <span>${quoteTotals.fuelCharge.toFixed(2)}</span>
              </div>
              {quoteTotals.minimumCharge > 0 && (
                <div className="ronyx-row">
                  <span>Minimum Charge Applied</span>
                  <span>${quoteTotals.minimumCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="ronyx-row" style={{ fontWeight: 700 }}>
                <span>Quote Total</span>
                <span>${quoteTotals.total.toFixed(2)}</span>
              </div>
              <div className="row-actions" style={{ marginTop: 12 }}>
                <button className="ronyx-action" onClick={handleCreateLoadFromQuote}>Create Load & Ticket</button>
                <button className="ronyx-action" onClick={handleCopyQuote}>Copy Quote</button>
                <button className="ronyx-action" onClick={handleEmailQuote}>Email to Customer</button>
                {quoteMessage && <span className="ronyx-label">{quoteMessage}</span>}
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
