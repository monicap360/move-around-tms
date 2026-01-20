"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type AssignedLoad = {
  id: string;
  load_number: string;
  route: string;
  status: string;
  customer_name?: string;
  job_site?: string;
  material?: string;
  quantity?: number;
  unit_type?: string;
  started_at?: string | null;
  completed_at?: string | null;
  ticket_id?: string | null;
};

export default function RonyxDriverAppPage() {
  const [driverName, setDriverName] = useState("");
  const [status, setStatus] = useState("Loaded");
  const [notes, setNotes] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [signature, setSignature] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [assignedLoads, setAssignedLoads] = useState<AssignedLoad[]>([]);
  const [loadMessage, setLoadMessage] = useState("");
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState("2 min ago");

  const loadAssignedLoads = useCallback(async () => {
    try {
      const res = await fetch(`/api/ronyx/loads?driver_name=${encodeURIComponent(driverName)}`);
      const data = await res.json();
      setAssignedLoads(data.loads || []);
    } catch (err) {
      console.error("Failed to load assigned loads", err);
      setAssignedLoads([]);
    }
  }, [driverName]);

  useEffect(() => {
    if (!driverName) {
      setAssignedLoads([]);
      return;
    }
    void loadAssignedLoads();
  }, [driverName, loadAssignedLoads]);

  async function submitUpdate(ticketId?: string) {
    await fetch("/api/ronyx/driver-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_name: driverName, status, notes, ticket_id: ticketId || null }),
    });
  }

  async function handleQuickAction(action: string, load?: AssignedLoad) {
    setStatus(action);
    await submitUpdate(load?.ticket_id || null);
    setLastSynced("Just now");
    setOfflineQueue((prev) => prev.filter((item) => item !== action));
  }

  async function handleTicketUpload(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const ticketRes = await fetch("/api/ronyx/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_number: ticketNumber || undefined, driver_name: driverName, status: "pending" }),
      });
      const ticketData = await ticketRes.json();
      const ticketId = ticketData.ticket?.id;

      if (!ticketId) {
        setMessage("Failed to create ticket.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", ticketId);
      formData.append("doc_type", "ticket");

      const uploadRes = await fetch("/api/ronyx/tickets/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.path) {
        await submitUpdate(ticketId);
        setMessage("Ticket uploaded and driver update sent.");
      } else {
        setMessage("Upload failed.");
      }
    } catch (err) {
      console.error("Upload failed", err);
      setMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    await submitUpdate();
    setMessage("Status update sent.");
  }

  async function startLoad(loadId: string) {
    setLoadMessage("");
    try {
      await fetch("/api/ronyx/loads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loadId, action: "start" }),
      });
      await loadAssignedLoads();
    } catch (err) {
      console.error("Failed to start load", err);
      setLoadMessage("Failed to start load.");
    }
  }

  async function completeLoad(load: AssignedLoad) {
    setLoadMessage("");
    try {
      const res = await fetch("/api/ronyx/loads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: load.id,
          action: "complete",
          digital_signature: signature || null,
          signature_name: signature || null,
          signed_at: signature ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      const ticketId = data.ticket_id;

      const file = proofFiles[load.id];
      if (file && ticketId) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ticket_id", ticketId);
        formData.append("doc_type", "pod");
        const uploadRes = await fetch("/api/ronyx/tickets/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.path) {
          await fetch("/api/ronyx/loads", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: load.id, pod_url: uploadData.path }),
          });
        }
      }

      await loadAssignedLoads();
      setLoadMessage("Load completed and proof recorded.");
    } catch (err) {
      console.error("Failed to complete load", err);
      setLoadMessage("Failed to complete load.");
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
          --primary: #0ea5e9;
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
          --secondary: #6b7280;
          --disabled: #374151;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 720px;
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
        .btn-touch-primary,
        .btn-touch-secondary,
        .btn-touch-warning,
        .btn-touch-success {
          height: 44px;
          padding: 0 18px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          text-transform: uppercase;
        }
        .btn-touch-primary {
          background: var(--primary);
          color: #ffffff;
        }
        .btn-touch-primary:hover {
          background: #0c94d1;
        }
        .btn-touch-primary:active {
          background: #0a83b9;
        }
        .btn-touch-secondary {
          background: var(--secondary);
          color: #ffffff;
        }
        .btn-touch-secondary:hover {
          background: #4b5563;
        }
        .btn-touch-secondary:active {
          background: #374151;
        }
        .btn-touch-warning {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-touch-warning:hover {
          background: #d97706;
        }
        .btn-touch-warning:active {
          background: #b45309;
        }
        .btn-touch-success {
          background: var(--success);
          color: #ffffff;
        }
        .btn-touch-success:hover {
          background: #059669;
        }
        .btn-touch-success:active {
          background: #047857;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Driver App</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Hauler App</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Simple, fast, offline-first driver workflow for today’s loads.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>
                Hauler App — {driverName || "Driver"} {driverName ? "(Truck #12)" : ""}
              </h2>
              <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
                Offline queue: {offlineQueue.length} • Last synced: {lastSynced}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ronyx-action">Start Shift</button>
              <button className="ronyx-action">Log Fuel</button>
              <button className="ronyx-action" onClick={() => setShowIssuePanel(true)}>Help</button>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Today’s Loads</h2>
          {assignedLoads.length === 0 ? (
            <div className="ronyx-row">No assigned loads yet. Enter your name to pull assignments.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {assignedLoads.map((load, idx) => (
                <div key={load.id} className="ronyx-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {idx === 0 ? "▶️ CURRENT LOAD" : "🕐 NEXT"} {load.load_number}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {load.customer_name || "Customer"} • {load.material || "Material"} • {load.quantity || "—"} {load.unit_type || ""}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {load.route}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="ronyx-action primary" onClick={() => setSelectedLoadId(load.id)}>
                      Open Load
                    </button>
                    <button className="ronyx-action">Call Dispatch</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedLoadId && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            {assignedLoads
              .filter((load) => load.id === selectedLoadId)
              .map((load) => (
                <div key={load.id} style={{ display: "grid", gap: 16 }}>
                  <div style={{ fontWeight: 700 }}>
                    LOAD {load.load_number} — {load.customer_name || "Customer"}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
                    {load.material || "Material"} | {load.route}
                  </div>
                  <div>
                    <div>1. ✅ ACCEPTED</div>
                    <div>2. 🟡 AT PIT</div>
                    <div>3. ⬜ EN ROUTE</div>
                    <div>4. ⬜ ON SITE</div>
                    <div>5. ⬜ DELIVERED</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-touch-primary" onClick={() => handleQuickAction("At Pit", load)}>
                      I’m at the Pit
                    </button>
                    <label className="btn-touch-secondary" style={{ cursor: "pointer" }}>
                      Add Photo
                      <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleTicketUpload(file);
                        }}
                      />
                    </label>
                    <button className="btn-touch-warning" onClick={() => setShowIssuePanel(true)}>
                      Report Issue
                    </button>
                    <button className="btn-touch-success" onClick={() => completeLoad(load)}>
                      Complete Delivery
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="ronyx-action" onClick={() => handleQuickAction("Loading Complete", load)}>
                      Loading Complete
                    </button>
                    <button className="ronyx-action" onClick={() => handleQuickAction("En Route", load)}>
                      En Route
                    </button>
                    <button className="ronyx-action" onClick={() => handleQuickAction("On Site", load)}>
                      On Site
                    </button>
                  </div>
                </div>
              ))}
          </section>
        )}

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Critical Actions</h2>
          <div className="ronyx-grid" style={{ rowGap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Capture Pit Ticket</div>
              <label className="ronyx-action" style={{ cursor: "pointer" }}>
                📷 Open Camera
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleTicketUpload(file);
                  }}
                />
              </label>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)", marginTop: 8 }}>
                Extracted data: Gross 36.2T | Tare 14.2T | Net 22.0T
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirm Delivery</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ronyx-action" onClick={() => handleQuickAction("On Site")}>
                  I’m on Site
                </button>
                <label className="ronyx-action" style={{ cursor: "pointer" }}>
                  📸 Photo of Pile
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setProofFiles((prev) => ({ ...prev, delivery: file }));
                    }}
                  />
                </label>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="ronyx-label">Customer Name</label>
                <input className="ronyx-input" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="ronyx-label">Sign Here</label>
                <input className="ronyx-input" value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {showIssuePanel && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Report Issue</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {["Site delayed me", "Need fuel advance", "Lost ticket", "Breakdown", "Other"].map((item) => (
                <button key={item} className="ronyx-action" onClick={() => setNotes(item)}>
                  {item}
                </button>
              ))}
              <label className="ronyx-label">Add Note</label>
              <input className="ronyx-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button className="ronyx-action primary" onClick={handleSubmit}>
                Send to Dispatch
              </button>
            </div>
          </section>
        )}

        <section className="ronyx-card">
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="ronyx-label">Driver Name</label>
              <input className="ronyx-input" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Status</label>
              <select className="ronyx-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>Loaded</option>
                <option>Empty</option>
                <option>At Pit</option>
                <option>At Jobsite</option>
                <option>Delayed</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Notes</label>
              <input className="ronyx-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Signature Capture (typed)</label>
              <input className="ronyx-input" value={signature} onChange={(e) => setSignature(e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Ticket Number (optional)</label>
              <input className="ronyx-input" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Upload Ticket Photo / PDF</label>
              <input
                className="ronyx-input"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleTicketUpload(file);
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button className="ronyx-action primary" onClick={handleSubmit} disabled={uploading}>
                {uploading ? "Uploading..." : "Send Status Update"}
              </button>
              <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{message}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
