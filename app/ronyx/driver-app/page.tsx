"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!driverName) {
      setAssignedLoads([]);
      return;
    }
    void loadAssignedLoads();
  }, [driverName]);

  async function submitUpdate(ticketId?: string) {
    await fetch("/api/ronyx/driver-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_name: driverName, status, notes, ticket_id: ticketId || null }),
    });
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

  async function loadAssignedLoads() {
    try {
      const res = await fetch(`/api/ronyx/loads?driver_name=${encodeURIComponent(driverName)}`);
      const data = await res.json();
      setAssignedLoads(data.loads || []);
    } catch (err) {
      console.error("Failed to load assigned loads", err);
      setAssignedLoads([]);
    }
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
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Driver App</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Driver Status & Ticket Upload</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Submit status updates, ticket photos, and notes from the field.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Assigned Loads</h2>
          {assignedLoads.length === 0 ? (
            <div className="ronyx-row">No assigned loads yet. Enter your name to pull assignments.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {assignedLoads.map((load) => (
                <div key={load.id} className="ronyx-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {load.load_number} • {load.route}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {load.customer_name || "Customer"} • {load.job_site || "Job Site"} • {load.material || "Material"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      Status: {load.status} • Started: {load.started_at ? new Date(load.started_at).toLocaleString() : "—"} •
                      Completed: {load.completed_at ? new Date(load.completed_at).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      className="ronyx-action"
                      onClick={() => startLoad(load.id)}
                      disabled={load.status === "active" || load.status === "completed"}
                    >
                      Start Load
                    </button>
                    <label className="ronyx-action" style={{ cursor: "pointer" }}>
                      Upload Proof
                      <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) =>
                          setProofFiles((prev) => ({ ...prev, [load.id]: e.target.files?.[0] || null }))
                        }
                      />
                    </label>
                    <button className="ronyx-action primary" onClick={() => completeLoad(load)} disabled={load.status === "completed"}>
                      Complete Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {loadMessage ? <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{loadMessage}</div> : null}
        </section>

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
