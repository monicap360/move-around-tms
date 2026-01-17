"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CustomerRequest = {
  id?: string;
  request_number: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  material_type: string;
  quantity: number;
  unit: string;
  pickup_location: string;
  delivery_location: string;
  requested_at: string;
  rate_type: string;
  rate_amount: number;
  status: string;
  priority: string;
  notes: string;
};

const statusOptions = ["new", "quoted", "scheduled", "converted", "cancelled"];
const priorityOptions = ["standard", "high", "urgent"];
const rateTypes = ["per_ton", "per_load", "per_hour", "per_yard"];

export default function RonyxCustomerRequestsPage() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [patInbox, setPatInbox] = useState([
    {
      id: "email-101",
      from: "dispatch@jonesconst.com",
      subject: "Need 15 tons gravel to Main St today",
      summary: "15 tons Gravel • Pit 7 → Main St Project",
      priority: "high",
      status: "new",
    },
    {
      id: "email-102",
      from: "ops@thompsonco.com",
      subject: "Quote request for fill sand",
      summary: "12 yards Fill Sand • Pit 3 → Oakridge Site",
      priority: "standard",
      status: "quoted",
    },
  ]);
  const [newRequest, setNewRequest] = useState<CustomerRequest>({
    request_number: "",
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    material_type: "",
    quantity: 0,
    unit: "tons",
    pickup_location: "",
    delivery_location: "",
    requested_at: "",
    rate_type: "per_ton",
    rate_amount: 0,
    status: "new",
    priority: "standard",
    notes: "",
  });

  const customerResults = [
    { name: "Jones Construction", hint: "Last request: 2 days ago | 15 loads total" },
    { name: "Thompson Contractors", hint: 'Preferred material: 3/4" Gravel' },
  ];

  const materialRates: Record<string, number> = {
    gravel_34: 12.5,
    fill_sand: 10.0,
    road_base: 14.5,
    topsoil: 11.25,
  };

  const selectedMaterialRate = materialRates[newRequest.material_type] || 0;
  const haulMiles = newRequest.pickup_location && newRequest.delivery_location ? 14 : 0;
  const haulingRate = 4.25;
  const materialCost = (Number(newRequest.quantity) || 0) * selectedMaterialRate;
  const haulingCost = haulMiles * haulingRate;
  const fuelSurcharge = (materialCost + haulingCost) * 0.035;
  const totalEstimate = materialCost + haulingCost + fuelSurcharge;

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/customer-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to load customer requests", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function createRequest(): Promise<CustomerRequest | null> {
    const payload = {
      ...newRequest,
      request_number: newRequest.request_number || `CR-${Math.floor(1000 + Math.random() * 9000)}`,
      requested_at: newRequest.requested_at ? new Date(newRequest.requested_at).toISOString() : null,
    };
    try {
      const res = await fetch("/api/ronyx/customer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.request) {
        setRequests((prev) => [data.request, ...prev]);
        setNewRequest({
          request_number: "",
          company_name: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          material_type: "",
          quantity: 0,
          unit: "tons",
          pickup_location: "",
          delivery_location: "",
          requested_at: "",
          rate_type: "per_ton",
          rate_amount: 0,
          status: "new",
          priority: "standard",
          notes: "",
        });
        setCustomerSearch("");
        setShowCustomerResults(false);
        return data.request;
      }
    } catch (err) {
      console.error("Failed to create customer request", err);
    }
    return null;
  }

  const convertPatEmail = async (itemId: string) => {
    const email = patInbox.find((item) => item.id === itemId);
    if (!email) return;
    const res = await fetch("/api/assistants/pat/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: email.subject }),
    });
    const data = await res.json();
    if (data?.extracted) {
      setNewRequest((prev) => ({
        ...prev,
        company_name: data.extracted.company_name || prev.company_name,
        material_type: data.extracted.material_type || prev.material_type,
        quantity: data.extracted.quantity || prev.quantity,
        unit: data.extracted.unit || prev.unit,
        pickup_location: data.extracted.pickup_location || prev.pickup_location,
        delivery_location: data.extracted.delivery_location || prev.delivery_location,
      }));
      await createRequest();
      setPatInbox((prev) => prev.map((item) => (item.id === itemId ? { ...item, status: "converted" } : item)));
    }
  };

  async function updateRequest(requestId: string, updates: Partial<CustomerRequest>) {
    setSavingId(requestId);
    try {
      const res = await fetch("/api/ronyx/customer-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, ...updates }),
      });
      const data = await res.json();
      if (data.request) {
        setRequests((prev) => prev.map((request) => (request.id === requestId ? data.request : request)));
      }
    } catch (err) {
      console.error("Failed to update customer request", err);
    } finally {
      setSavingId(null);
    }
  }

  async function convertToLoad(request: CustomerRequest) {
    if (!request.id) return;
    setSavingId(request.id);
    try {
      const route = `${request.pickup_location} → ${request.delivery_location}`;
      await fetch("/api/ronyx/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          load_number: request.request_number || `LD-${Math.floor(1000 + Math.random() * 9000)}`,
          route,
          status: "available",
          driver_name: "",
          customer_name: request.company_name,
        }),
      });
      await updateRequest(request.id, { status: "converted" });
    } catch (err) {
      console.error("Failed to convert request", err);
    } finally {
      setSavingId(null);
    }
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
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
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
        .request-header {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 18px;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
          margin-bottom: 20px;
          display: grid;
          gap: 8px;
        }
        .smart-request-form {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 18px;
          margin-bottom: 20px;
          display: grid;
          gap: 16px;
        }
        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .search-wrapper {
          position: relative;
        }
        .search-results {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 8px;
          z-index: 10;
          display: grid;
          gap: 6px;
        }
        .result-item {
          padding: 8px 10px;
          border-radius: 10px;
          background: #f8fafc;
          cursor: pointer;
        }
        .quantity-input {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }
        .price-preview {
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 12px;
          background: #f8fafc;
        }
        .price-line {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 0.85rem;
        }
        .price-line.total {
          margin-top: 8px;
          font-weight: 700;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ronyx-action {
          padding: 10px 16px;
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
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
          gap: 12px;
          flex-wrap: wrap;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
      `}</style>

      <div className="ronyx-container">
        <div className="request-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <p className="ronyx-pill">Customer Request Hub</p>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 6 }}>Request Intake Dashboard</h1>
              <p style={{ color: "rgba(15,23,42,0.7)" }}>
                Today: 8 new requests | 6 converted to loads | 75% conversion rate
              </p>
              <p style={{ color: "rgba(15,23,42,0.7)" }}>This week: $42,500 in new business from requests</p>
            </div>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="smart-request-form">
          <div className="form-group">
            <label className="ronyx-label">Customer / Company *</label>
            <div className="search-wrapper">
              <input
                className="ronyx-input"
                placeholder="Start typing company or contact name..."
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  setShowCustomerResults(true);
                }}
                onFocus={() => setShowCustomerResults(true)}
              />
              {showCustomerResults && customerSearch && (
                <div className="search-results">
                  {customerResults
                    .filter((item) => item.name.toLowerCase().includes(customerSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.name}
                        className="result-item"
                        onClick={() => {
                          setCustomerSearch(item.name);
                          setNewRequest((prev) => ({ ...prev, company_name: item.name }));
                          setShowCustomerResults(false);
                        }}
                      >
                        <strong>{item.name}</strong>
                        <small>{item.hint}</small>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="ronyx-label">Material Type *</label>
              <select
                className="ronyx-input"
                value={newRequest.material_type}
                onChange={(event) => setNewRequest((prev) => ({ ...prev, material_type: event.target.value }))}
              >
                <option value="">Select material...</option>
                <option value="gravel_34">3/4" Crushed Gravel</option>
                <option value="fill_sand">Fill Sand</option>
                <option value="road_base">Road Base</option>
                <option value="topsoil">Topsoil</option>
              </select>
            </div>
            <div className="form-group">
              <label className="ronyx-label">Quantity *</label>
              <div className="quantity-input">
                <input
                  className="ronyx-input"
                  type="number"
                  min={1}
                  value={newRequest.quantity || ""}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                />
                <select
                  className="ronyx-input"
                  value={newRequest.unit}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, unit: event.target.value }))}
                >
                  <option value="tons">Tons</option>
                  <option value="yards">Cubic Yards</option>
                  <option value="loads">Loads</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="ronyx-label">Pickup Location *</label>
              <select
                className="ronyx-input"
                value={newRequest.pickup_location}
                onChange={(event) => setNewRequest((prev) => ({ ...prev, pickup_location: event.target.value }))}
              >
                <option value="">Select pit or yard...</option>
                <option value="Pit 7">Pit 7 - 123 Aggregate Rd</option>
                <option value="Pit 3">Pit 3 - 456 Quarry Ln</option>
                <option value="Yard A">Yard A - Main Storage</option>
              </select>
            </div>
            <div className="form-group">
              <label className="ronyx-label">Delivery Location *</label>
              <input
                className="ronyx-input"
                placeholder="Enter address or job site name..."
                value={newRequest.delivery_location}
                onChange={(event) => setNewRequest((prev) => ({ ...prev, delivery_location: event.target.value }))}
              />
            </div>
          </div>

          <div className="price-preview">
            <h4>💵 Quote Preview</h4>
            <div className="price-line">
              <span>
                Material ({newRequest.quantity || 0} {newRequest.unit || "tons"} @ $
                {selectedMaterialRate.toFixed(2)}/unit):
              </span>
              <span>${materialCost.toFixed(2)}</span>
            </div>
            <div className="price-line">
              <span>Hauling ({haulMiles} miles @ ${haulingRate.toFixed(2)}/mile):</span>
              <span>${haulingCost.toFixed(2)}</span>
            </div>
            <div className="price-line">
              <span>Fuel Surcharge (3.5%):</span>
              <span>${fuelSurcharge.toFixed(2)}</span>
            </div>
            <div className="price-line total">
              <span>Total Estimated Price:</span>
              <span>${totalEstimate.toFixed(2)}</span>
            </div>
          </div>

          <div className="form-actions">
            <button className="ronyx-action">Save as Draft</button>
            <button className="ronyx-action primary" onClick={createRequest} disabled={savingId !== null}>
              {savingId ? "Saving..." : "Create Quote & Send"}
            </button>
            <button
              className="ronyx-action primary"
              onClick={async () => {
                const created = await createRequest();
                if (created) {
                  await convertToLoad(created);
                }
              }}
              disabled={savingId !== null}
            >
              ✅ Convert to Load & Dispatch Now
            </button>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Pat Inbox — Email to Order</h2>
            <span className="ronyx-pill">Auto-triage active</span>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {patInbox.map((email) => (
              <div key={email.id} className="ronyx-row">
                <div>
                  <div style={{ fontWeight: 700 }}>{email.subject}</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>
                    {email.from} • {email.summary}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="ronyx-pill">{email.priority.toUpperCase()}</span>
                  <button className="ronyx-action" onClick={() => convertPatEmail(email.id)} disabled={savingId !== null}>
                    Convert to Request
                  </button>
                  <button className="ronyx-action">Reply</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Active Requests</h2>
          {loading ? (
            <div className="ronyx-row">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="ronyx-row">No requests yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {requests.map((request) => (
                <div key={request.id || request.request_number} className="ronyx-row">
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {request.request_number || "Request"} · {request.company_name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>
                      {request.material_type} · {request.quantity} {request.unit} · {request.pickup_location} →{" "}
                      {request.delivery_location}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      className="ronyx-input"
                      style={{ minWidth: 120 }}
                      value={request.status}
                      onChange={(e) => request.id && updateRequest(request.id, { status: e.target.value })}
                      disabled={savingId === request.id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      className="ronyx-input"
                      style={{ minWidth: 120 }}
                      value={request.priority}
                      onChange={(e) => request.id && updateRequest(request.id, { priority: e.target.value })}
                      disabled={savingId === request.id}
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                    <button
                      className="ronyx-action"
                      onClick={() => convertToLoad(request)}
                      disabled={savingId === request.id || request.status === "converted"}
                    >
                      {request.status === "converted" ? "Converted" : "Create Load"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
