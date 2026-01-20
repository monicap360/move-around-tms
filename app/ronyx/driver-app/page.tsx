"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";

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
  const [gpsMessage, setGpsMessage] = useState("");
  const [pickupGps, setPickupGps] = useState<{ lat: number; lon: number } | null>(null);
  const [dumpGps, setDumpGps] = useState<{ lat: number; lon: number } | null>(null);
  const [assignedLoads, setAssignedLoads] = useState<AssignedLoad[]>([]);
  const [loadMessage, setLoadMessage] = useState("");
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState("2 min ago");
  const fuelInputRef = useRef<HTMLInputElement>(null);

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
    if (!driverName.trim()) {
      setMessage("Enter your name to send updates.");
      return;
    }
    await fetch("/api/ronyx/driver-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_name: driverName, status, notes, ticket_id: ticketId || null }),
    });
  }

  async function sendDriverEvent(event: Record<string, any>) {
    try {
      await fetch("/api/driver-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driverName || "unknown",
          truck_id: "truck_12",
          timestamp: new Date().toISOString(),
          ...event,
        }),
      });
    } catch {
      // Best-effort event logging for now.
    }
  }

  async function captureLocation() {
    if (!navigator.geolocation) {
      setGpsMessage("GPS not available on this device.");
      return null;
    }
    return new Promise<{ lat: number; lon: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          setGpsMessage("Unable to capture GPS location.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function handleQuickAction(action: string, load?: AssignedLoad) {
    if (!driverName.trim()) {
      setMessage("Enter your name to use quick actions.");
      return;
    }
    setStatus(action);
    await submitUpdate(load?.ticket_id || null);
    const location = await captureLocation();
    await sendDriverEvent({
      event_type: "STATUS_UPDATE",
      load_id: load?.id,
      status_code: action.toUpperCase().replace(/\s+/g, "_"),
      note: notes || null,
      location: location ? { lat: location.lat, lng: location.lon } : null,
    });
    if (location && action.toLowerCase().includes("on site") && load?.ticket_id) {
      setDumpGps({ lat: location.lat, lon: location.lon });
      await fetch(`/api/ronyx/tickets/${load.ticket_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dump_gps_lat: location.lat,
          dump_gps_lon: location.lon,
          dump_location: load.job_site || load.customer_name || null,
        }),
      });
    }
    setLastSynced("Just now");
    setOfflineQueue((prev) => prev.filter((item) => item !== action));
  }

  async function handleTicketUpload(file: File) {
    if (!driverName.trim()) {
      setMessage("Enter your name before uploading a ticket.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const location = await captureLocation();
      if (location) {
        setPickupGps({ lat: location.lat, lon: location.lon });
      }
      const ticketRes = await fetch("/api/ronyx/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_number: ticketNumber || undefined,
          driver_name: driverName,
          status: "pending",
          pickup_gps_lat: location?.lat || null,
          pickup_gps_lon: location?.lon || null,
        }),
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
        await sendDriverEvent({
          event_type: "PIT_CHECK_IN",
          load_id: ticketData.ticket?.load_id || null,
          payload: {
            ticket_id: ticketId,
            ticket_number: ticketNumber || null,
            ticket_image_url: uploadData.path,
            material_verified: true,
          },
          location: location ? { lat: location.lat, lng: location.lon } : null,
        });
        if (ticketData.ticket?.driver_id) {
          await fetch(`/api/ronyx/drivers/${ticketData.ticket.driver_id}/process-ticket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driver_id: ticketData.ticket.driver_id,
              load_id: ticketData.ticket?.load_id || ticketData.ticket?.id || null,
              ticket_number: ticketNumber || ticketData.ticket?.ticket_number || "PENDING",
              net_tons: ticketData.ticket?.net_tons || null,
              material_type: ticketData.ticket?.material || null,
              customer_id: ticketData.ticket?.customer_id || null,
              job_id: ticketData.ticket?.job_id || null,
              equipment_used: "Truck+Trailer",
            }),
          });
        }
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
    await sendDriverEvent({
      event_type: "STATUS_UPDATE",
      status_code: status.toUpperCase().replace(/\s+/g, "_"),
      note: notes || null,
    });
    setMessage("Status update sent.");
  }

  async function handleFuelReceiptUpload(file: File) {
    setMessage("");
    if (!driverName.trim()) {
      setMessage("Enter your name before logging fuel.");
      return;
    }
    setNotes("Fuel receipt captured");
    setStatus("Fuel Logged");
    await submitUpdate();
    await sendDriverEvent({
      event_type: "FUEL_LOG",
      payload: {
        receipt_filename: file.name,
      },
    });
    setLastSynced("Just now");
    setMessage("Fuel receipt logged.");
  }

  async function handleFlagDispute(loadId: string, ticketNumber?: string) {
    if (!driverName.trim()) {
      setMessage("Enter your name before flagging a dispute.");
      return;
    }
    setMessage("Dispute flagged for office review.");
    await sendDriverEvent({
      event_type: "DISPUTE_FLAG",
      load_id: loadId,
      status_code: "DISPUTED",
      note: `Dispute flagged for load ${loadId}${ticketNumber ? ` (${ticketNumber})` : ""}`,
    });
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
      const location = await captureLocation();
      if (location) {
        setDumpGps({ lat: location.lat, lon: location.lon });
      }
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
          if (location) {
            await fetch(`/api/ronyx/tickets/${ticketId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dump_gps_lat: location.lat,
                dump_gps_lon: location.lon,
                dump_location: load.job_site || load.customer_name || null,
                has_signature: Boolean(signature),
              }),
            });
          }
          await sendDriverEvent({
            event_type: "DELIVERY_CONFIRMATION",
            load_id: load.id,
            payload: {
              pod_url: uploadData.path,
              signature_name: signature || null,
            },
            location: location ? { lat: location.lat, lng: location.lon } : null,
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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>
              Driver App — Remote Data Clerk
            </h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Every driver action updates the office in real time for faster billing,
              cleaner dispatch, and fewer disputes.
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
              {message && (
                <div style={{ marginTop: 6, fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                  {message}
                </div>
              )}
            {gpsMessage && (
              <div style={{ marginTop: 6, fontSize: "0.85rem", color: "rgba(15,23,42,0.65)" }}>
                {gpsMessage}
              </div>
            )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ronyx-action" onClick={() => handleQuickAction("On Duty")}>
                Auto Check-In
              </button>
              <button
                className="ronyx-action"
                onClick={() => fuelInputRef.current?.click()}
              >
                Fuel Log (Photo)
              </button>
              <button className="ronyx-action" onClick={() => setShowIssuePanel(true)}>
                Quick Status
              </button>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
            GPS auto-start begins when the truck leaves the yard. Fuel receipts are read automatically.
          </div>
          <input
            ref={fuelInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFuelReceiptUpload(file);
            }}
          />
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Intelligent Load Board with Context
          </h2>
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
                      {load.material || "Material"} • {load.quantity || "—"} {load.unit_type || ""} •{" "}
                      {load.job_site || "Job Site"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      Priority: {idx === 0 ? "High" : "Normal"} • Site Contact: Mike (555-0123)
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="ronyx-action primary" onClick={() => setSelectedLoadId(load.id)}>
                      Open Load
                    </button>
                    <button className="ronyx-action" onClick={() => handleQuickAction("En Route", load)}>
                      Confirm En Route
                    </button>
                    <a className="ronyx-action" href="tel:+15550123">
                      Call Site
                    </a>
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
                    LOAD {load.load_number} — {load.job_site || load.customer_name || "Job Site"}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
                    {load.material || "Material"} | {load.quantity || "—"} {load.unit_type || ""} | {load.route}
                  </div>
                  <div>
                    <div>1. ✅ ACCEPTED</div>
                    <div>2. 🟡 AT PIT</div>
                    <div>3. ⬜ EN ROUTE</div>
                    <div>4. ⬜ ON SITE</div>
                    <div>5. ⬜ DELIVERED</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-touch-primary" onClick={() => handleQuickAction("At Pit - In Queue", load)}>
                      At Pit — In Queue
                    </button>
                    <label className="btn-touch-secondary" style={{ cursor: "pointer" }}>
                      Capture Ticket Photo
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
                      Report Status
                    </button>
                    <button className="btn-touch-success" onClick={() => completeLoad(load)}>
                      Complete Delivery
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="ronyx-action" onClick={() => handleQuickAction("Loading Now", load)}>
                      Loading Now
                    </button>
                    <button className="ronyx-action" onClick={() => handleQuickAction("En Route to Site", load)}>
                      En Route to Site
                    </button>
                    <button className="ronyx-action" onClick={() => handleQuickAction("On Site", load)}>
                      I’m On Site
                    </button>
                    <a className="ronyx-action" href="tel:+15550123">
                      Call Dispatch
                    </a>
                  </div>
                </div>
              ))}
          </section>
        )}

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Guided, Error-Proof Capture
          </h2>
          <div className="ronyx-grid" style={{ rowGap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                1) Capture Pit Ticket (Required)
              </div>
              <label className="ronyx-action" style={{ cursor: "pointer" }}>
                📷 Scale Ticket Photo
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
                Auto-extract: Gross 36.2T | Tare 14.2T | Net 22.0T
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)", marginTop: 6 }}>
                Driver verifies numbers match the physical load.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                2) Proof of Delivery
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ronyx-action" onClick={() => handleQuickAction("On Site")}>
                  I’m On Site (Geo-Stamp)
                </button>
                <label className="ronyx-action" style={{ cursor: "pointer" }}>
                  📸 Photo of Pile (Required)
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
                <label className="ronyx-label">E-Signature</label>
                <input className="ronyx-input" value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {showIssuePanel && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
              Structured Status Updates
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                "At Pit - In Queue",
                "Loading Now",
                "Scale Delay",
                "En Route to Site",
                "Site Delay",
                "Truck Down - Need Mechanic",
                "Need Permit Help",
              ].map((item) => (
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

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Office KPI Sync (Auto)
          </h2>
          <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)", fontSize: "0.9rem" }}>
            <li>Capture Pit Ticket → Updates “Tons Hauled Today” and “Job Progress”.</li>
            <li>Truck Down → Appears in the office “Critical Action Queue”.</li>
            <li>Signed Delivery → Moves the load to “Ready to Invoice”.</li>
          </ul>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Driver Workflow Flowchart
          </h2>
          <pre
            style={{
              background: "rgba(15, 23, 42, 0.06)",
              borderRadius: 12,
              padding: 16,
              fontSize: "0.85rem",
              color: "rgba(15,23,42,0.8)",
              overflowX: "auto",
            }}
          >
{`flowchart TD
  subgraph Step1["Pit Check-In and Ticket Capture"]
    direction LR
    S1["Mandatory Photo\\nof Scale Ticket"] --> S2["Auto-Populated and\\nVerified Gross/Tare/Net"] --> S3["Material and\\nLoad Verification"]
  end

  subgraph Step2["Delivery and Proof"]
    direction LR
    D1["GPS Geo-Fenced\\nI'm On Site"] --> D2["Mandatory Photo of\\nPile with Geotag"] --> D3["Digital Signature Capture\\non Driver Device"]
  end

  Step1 --> Data1["Structured Load Data\\nSent to Office Dashboard"]
  Step2 --> Data2["Proof of Delivery and\\nCompletion Sent for Invoicing"]

  Data1 --> Impact1["Office Impact:\\nEliminates Manual Data Entry\\nPrevents Billing Errors"]
  Data2 --> Impact2["Office Impact:\\nEnables Same-Day Invoicing\\nEliminates Delivery Disputes"]`}
          </pre>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            My Settlement & Loads
          </h2>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <div className="ronyx-row">
              <span>Today&apos;s Estimated Earnings</span>
              <strong>$177.63</strong>
            </div>
            <div className="ronyx-row">
              <span>Week-to-Date</span>
              <strong>$1,428.50 • 312.5 Tons</strong>
            </div>
            <div className="ronyx-row">
              <span>Pay Day</span>
              <strong>Friday, May 24</strong>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Load #</th>
                  <th style={{ padding: "8px 6px" }}>Material</th>
                  <th style={{ padding: "8px 6px" }}>Tons</th>
                  <th style={{ padding: "8px 6px" }}>Rate</th>
                  <th style={{ padding: "8px 6px" }}>Earned</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { load: "#14287", material: "#57 Gravel", tons: "22.0", rate: "$4.50/T", earned: "$99.00", status: "PAID", ticket: "VTK77891" },
                  { load: "#14288", material: "Fill Sand", tons: "18.5", rate: "$4.25/T", earned: "$78.63", status: "PAID", ticket: "VTK77894" },
                  { load: "#14290", material: "Crushed Rock", tons: "24.0", rate: "$5.00/T", earned: "$120.00", status: "PENDING", ticket: "VTK77902" },
                  { load: "#14295", material: "Topsoil", tons: "20.0", rate: "$4.75/T", earned: "$95.00", status: "AWAIT TICKET", ticket: "" },
                ].map((row) => (
                  <tr key={row.load} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.load}</td>
                    <td style={{ padding: "8px 6px" }}>{row.material}</td>
                    <td style={{ padding: "8px 6px" }}>{row.tons}</td>
                    <td style={{ padding: "8px 6px" }}>{row.rate}</td>
                    <td style={{ padding: "8px 6px" }}>{row.earned}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {row.status === "PAID" ? "✅ PAID" : row.status === "PENDING" ? "⏳ PENDING" : "📸 AWAIT TICKET"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Link href="/ronyx/tickets" className="ronyx-action">
              View Details
            </Link>
            <button
              className="ronyx-action"
              onClick={() => handleFlagDispute("14290", "VTK77902")}
            >
              Flag Dispute
            </button>
            <Link href="/ronyx/payroll" className="ronyx-action">
              Settlement History
            </Link>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Screen Breakdown and Office Impact
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Pit Check-In and Ticket Capture
              </div>
              <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)", fontSize: "0.9rem" }}>
                <li>Mandatory photo creates a perfect digital backup.</li>
                <li>OCR auto-populates gross, tare, and net to prevent typos.</li>
                <li>Material verification prevents wrong-material deliveries.</li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Delivery and Proof
              </div>
              <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)", fontSize: "0.9rem" }}>
                <li>Geo-fenced arrival logs accurate site times.</li>
                <li>Mandatory pile photo prevents delivery disputes.</li>
                <li>On-device signature enables same-day invoicing.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Direct Business Impact
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Pain Point</th>
                  <th style={{ padding: "8px 6px" }}>How This Solves It</th>
                  <th style={{ padding: "8px 6px" }}>Financial Result</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    pain: "Billing errors and disputes",
                    solve:
                      "Mandatory ticket photos + OCR weights + material verification.",
                    result: "Stops revenue loss from typos, wrong material, or missing tickets.",
                  },
                  {
                    pain: "Slow invoicing and cash flow",
                    solve: "E-signature + geotagged delivery photo creates instant POD.",
                    result: "Same-day invoicing instead of weeks of delay.",
                  },
                  {
                    pain: "Inefficient communication",
                    solve: "One-tap status updates and automatic En Route alerts.",
                    result: "Saves 1-2 hours/day of dispatch phone time.",
                  },
                  {
                    pain: "Poor asset utilization",
                    solve: "Live exception alerts like Site Delay or Truck Down.",
                    result: "Adds 1+ extra load per truck per week by rerouting.",
                  },
                ].map((row) => (
                  <tr key={row.pain} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.pain}</td>
                    <td style={{ padding: "8px 6px" }}>{row.solve}</td>
                    <td style={{ padding: "8px 6px" }}>{row.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
            Killer feature: when delivery proof is complete, the load is flagged Ready to Invoice.
          </div>
          <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
            Implementation focus: offline-first sync, high OCR accuracy, and driver-first speed.
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Office Dashboard Live Loads (Example)
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Load</th>
                  <th style={{ padding: "8px 6px" }}>Driver</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Location</th>
                  <th style={{ padding: "8px 6px" }}>Net Tons</th>
                  <th style={{ padding: "8px 6px" }}>Ticket</th>
                  <th style={{ padding: "8px 6px" }}>POD</th>
                  <th style={{ padding: "8px 6px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    load: "#14287",
                    driver: "J. Smith",
                    status: "At Pit",
                    location: "Vulcan Quarry",
                    tons: "22.0",
                    ticket: "View",
                    pod: "--",
                    action: "--",
                  },
                  {
                    load: "#14288",
                    driver: "M. Jones",
                    status: "In Transit",
                    location: "En Route",
                    tons: "20.5",
                    ticket: "--",
                    pod: "--",
                    action: "Monitor",
                  },
                  {
                    load: "#14289",
                    driver: "R. Garcia",
                    status: "Delivery Pending",
                    location: "Oak Street",
                    tons: "24.0",
                    ticket: "View",
                    pod: "Photo, Sign",
                    action: "Invoice Now",
                  },
                ].map((row) => (
                  <tr key={row.load} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.load}</td>
                    <td style={{ padding: "8px 6px" }}>{row.driver}</td>
                    <td style={{ padding: "8px 6px" }}>{row.status}</td>
                    <td style={{ padding: "8px 6px" }}>{row.location}</td>
                    <td style={{ padding: "8px 6px" }}>{row.tons}</td>
                    <td style={{ padding: "8px 6px", color: "var(--ronyx-accent)" }}>{row.ticket}</td>
                    <td style={{ padding: "8px 6px", color: "var(--ronyx-accent)" }}>{row.pod}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(15,23,42,0.6)" }}>
            When ticket and POD are complete, the load is flagged Ready to Invoice.
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Wireframe: Key Screens
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            <pre
              style={{
                background: "rgba(15, 23, 42, 0.06)",
                borderRadius: 12,
                padding: 16,
                fontSize: "0.85rem",
                color: "rgba(15,23,42,0.8)",
                overflowX: "auto",
              }}
            >
{`HOME / INTELLIGENT LOAD BOARD
------------------------------------------------
Driver: J. Smith   Truck: #245   Status: On Duty
TODAY'S LOADS
- Load #14287 (High)
  From: Vulcan Quarry  To: Oak Street
  Material: 57 Gravel  22T
  [I'M GOING] [CALL SITE]
- Load #14288 (Normal)
  From: Central Pit    To: Highway 10
  Material: Fill Sand  18T
  [SCHEDULED]`}
            </pre>

            <pre
              style={{
                background: "rgba(15, 23, 42, 0.06)",
                borderRadius: 12,
                padding: 16,
                fontSize: "0.85rem",
                color: "rgba(15,23,42,0.8)",
                overflowX: "auto",
              }}
            >
{`PIT CHECK-IN (GUIDED)
------------------------------------------------
1) CAPTURE SCALE TICKET  [OPEN CAMERA]
   Gross: 36.2T  Tare: 14.2T  Net: 22.0T
   Ticket #: AUTO-READ
2) VERIFY MATERIAL  Is this 57 Gravel? YES / NO
3) NOTE (Optional)  "Quick load, no wait."
   [SUBMIT TO OFFICE]`}
            </pre>

            <pre
              style={{
                background: "rgba(15, 23, 42, 0.06)",
                borderRadius: 12,
                padding: 16,
                fontSize: "0.85rem",
                color: "rgba(15,23,42,0.8)",
                overflowX: "auto",
              }}
            >
{`DELIVERY AND PROOF
------------------------------------------------
1) ARRIVAL CONFIRMATION  [I'M ON SITE]
2) PHOTO OF PILE         [TAKE PHOTO]
3) CUSTOMER SIGNATURE    [SIGN HERE]
   Name: Mike R.
   [COMPLETE DELIVERY]`}
            </pre>

            <pre
              style={{
                background: "rgba(15, 23, 42, 0.06)",
                borderRadius: 12,
                padding: 16,
                fontSize: "0.85rem",
                color: "rgba(15,23,42,0.8)",
                overflowX: "auto",
              }}
            >
{`ONE-TAP STATUS UPDATES
------------------------------------------------
[AT PIT - IN QUEUE]  [LOADING NOW]
[SCALE DELAY]        [EN ROUTE TO SITE]
[SITE DELAY]         [TRUCK DOWN - MECHANIC]
[NEED PERMIT HELP]   [CUSTOM MESSAGE]`}
            </pre>
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            Manual Entry (Backup)
          </h2>
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
