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

  async function createRequest() {
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
      }
    } catch (err) {
      console.error("Failed to create customer request", err);
    }
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Customer Intake</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Customer Request Intake</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Capture inbound requests and convert them directly into loads.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>New Request</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Request Number (optional)</label>
              <input
                className="ronyx-input"
                value={newRequest.request_number}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, request_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Company Name</label>
              <input
                className="ronyx-input"
                value={newRequest.company_name}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Contact Name</label>
              <input
                className="ronyx-input"
                value={newRequest.contact_name}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, contact_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Contact Email</label>
              <input
                className="ronyx-input"
                type="email"
                value={newRequest.contact_email}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Contact Phone</label>
              <input
                className="ronyx-input"
                value={newRequest.contact_phone}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Material Type</label>
              <input
                className="ronyx-input"
                value={newRequest.material_type}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, material_type: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Quantity</label>
              <input
                className="ronyx-input"
                type="number"
                value={newRequest.quantity || ""}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Unit</label>
              <input
                className="ronyx-input"
                value={newRequest.unit}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Pickup Location</label>
              <input
                className="ronyx-input"
                value={newRequest.pickup_location}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, pickup_location: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Delivery Location</label>
              <input
                className="ronyx-input"
                value={newRequest.delivery_location}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, delivery_location: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Requested Date/Time</label>
              <input
                className="ronyx-input"
                type="datetime-local"
                value={newRequest.requested_at}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, requested_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Rate Type</label>
              <select
                className="ronyx-input"
                value={newRequest.rate_type}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, rate_type: e.target.value }))}
              >
                {rateTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ronyx-label">Rate Amount</label>
              <input
                className="ronyx-input"
                type="number"
                value={newRequest.rate_amount || ""}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, rate_amount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="ronyx-label">Priority</label>
              <select
                className="ronyx-input"
                value={newRequest.priority}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ronyx-label">Status</label>
              <select
                className="ronyx-input"
                value={newRequest.status}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, status: e.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="ronyx-label">Notes</label>
              <input
                className="ronyx-input"
                value={newRequest.notes}
                onChange={(e) => setNewRequest((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="ronyx-action primary" onClick={createRequest}>
              Create Request
            </button>
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
