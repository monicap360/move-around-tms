"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DriverStatus = "Active" | "Available" | "Assigned" | "Inactive" | "Suspended";
type DocumentStatus = "Good" | "Expiring" | "Expired" | "Missing";

type Driver = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  truck: string;
  trailer: string;
  status: DriverStatus;
  driverType: "W2" | "1099" | "Owner Operator";
  cdl: string;
  cdlState: string;
  cdlExp: string;
  mvrExp: string;
  medicalExp: string;
  docs: DocumentStatus;
  rating: number;
  safetyScore: number;
  onTime: number;
  lastLoad: string;
  revenueWeek: string;
};

type ComplianceAlert = {
  title: string;
  driver: string;
  detail: string;
  level: "critical" | "warning";
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function computeDocStatus(fields: { cdlExp: string; mvrExp: string; medicalExp: string }): DocumentStatus {
  const dates = [fields.cdlExp, fields.mvrExp, fields.medicalExp];
  const days = dates.map(daysUntil);

  // Any missing
  if (days.some((d) => d === null)) return "Missing";
  // Any expired
  if (days.some((d) => d !== null && d < 0)) return "Expired";
  // Any expiring within 30 days
  if (days.some((d) => d !== null && d <= 30)) return "Expiring";
  return "Good";
}

function normalizeStatus(raw: string): DriverStatus {
  const s = (raw || "").toLowerCase();
  if (s === "suspended") return "Suspended";
  if (s === "inactive")  return "Inactive";
  if (s === "assigned")  return "Assigned";
  if (s === "available") return "Available";
  return "Active";
}

function normalizeDrType(raw: string): "W2" | "1099" | "Owner Operator" {
  const s = (raw || "").toLowerCase();
  if (s === "1099") return "1099";
  if (s.includes("owner")) return "Owner Operator";
  return "W2";
}

function mapApiDriver(d: any): Driver {
  const cdlExp     = fmtDate(d.license_expiration_date);
  const mvrExp     = fmtDate(d.mvr_expiration);
  const medicalExp = fmtDate(d.medical_card_expiration);

  return {
    id:          d.id,
    name:        d.full_name || d.name || "Unknown",
    role:        d.position_role || "Driver",
    phone:       d.phone || "—",
    email:       d.email || "—",
    location:    d.address ? d.address.split(",").slice(-2).join(",").trim() : "—",
    truck:       d.assigned_truck_number || "—",
    trailer:     "—",
    status:      normalizeStatus(d.status),
    driverType:  normalizeDrType(d.driver_type),
    cdl:         d.license_number || "—",
    cdlState:    d.license_state  || "—",
    cdlExp,
    mvrExp,
    medicalExp,
    docs:        computeDocStatus({ cdlExp: d.license_expiration_date, mvrExp: d.mvr_expiration, medicalExp: d.medical_card_expiration }),
    rating:      Number(d.rating) || 0,
    safetyScore: 100,
    onTime:      100,
    lastLoad:    "—",
    revenueWeek: "—",
  };
}

function buildAlerts(drivers: Driver[]): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  for (const d of drivers) {
    if (d.docs === "Expired") {
      alerts.push({ title: "Expired Documents", driver: d.name, detail: "One or more compliance docs are expired", level: "critical" });
    } else if (d.docs === "Expiring") {
      alerts.push({ title: "Documents Expiring Soon", driver: d.name, detail: "Docs expire within 30 days — action required", level: "warning" });
    } else if (d.docs === "Missing") {
      alerts.push({ title: "Missing Documents", driver: d.name, detail: "CDL, MVR, or medical card date not on file", level: "warning" });
    }
  }
  return alerts.slice(0, 6);
}

function StatusBadge({ status }: { status: DriverStatus | DocumentStatus }) {
  const cls =
    status === "Available" || status === "Good" || status === "Active"
      ? "premium-badge green"
      : status === "Assigned"
      ? "premium-badge blue"
      : status === "Expiring"
      ? "premium-badge amber"
      : "premium-badge red";
  return <span className={cls}>{status}</span>;
}

export default function DriversPage() {
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("All Statuses");
  const [docFilter, setDoc]         = useState("All Docs");

  useEffect(() => {
    fetch("/api/ronyx/drivers/list")
      .then((r) => r.json())
      .then((data) => {
        setAllDrivers((data.drivers || []).map(mapApiDriver));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q)  ||
        d.phone.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.truck.toLowerCase().includes(q) ||
        d.cdl.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All Statuses" || d.status === statusFilter;

      const matchDoc =
        docFilter === "All Docs" ||
        d.docs === docFilter ||
        (docFilter === "Needs Attention" && ["Expiring", "Expired", "Missing"].includes(d.docs));

      return matchSearch && matchStatus && matchDoc;
    });
  }, [allDrivers, search, statusFilter, docFilter]);

  const complianceAlerts = useMemo(() => buildAlerts(allDrivers), [allDrivers]);

  const activeDrivers   = allDrivers.filter((d) => d.status !== "Inactive").length;
  const availableDrivers = allDrivers.filter((d) => d.status === "Available").length;
  const assignedDrivers  = allDrivers.filter((d) => d.status === "Assigned").length;
  const documentIssues   = allDrivers.filter((d) => ["Expiring", "Expired", "Missing"].includes(d.docs)).length;

  const topDriver = useMemo(
    () => [...allDrivers].sort((a, b) => b.rating - a.rating)[0] ?? null,
    [allDrivers]
  );

  return (
    <main className="premium-page">
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Fleet Command / Drivers</p>
          <h1>Driver Management</h1>
          <p>
            Manage driver profiles, compliance, MVRs, CDL records, medical cards,
            assignments, ratings, documents, and weekly performance from one command center.
          </p>
        </div>
        <div className="premium-hero-actions">
          <button className="premium-button ghost">Export Drivers</button>
          <button className="premium-button dark">Upload Documents</button>
          <Link href="/ronyx/drivers/new" className="premium-button primary">
            + Add Driver
          </Link>
        </div>
      </section>

      <section className="premium-kpi-grid">
        <div className="premium-kpi">
          <span>Total Drivers</span>
          <strong>{loading ? "…" : allDrivers.length}</strong>
          <p>In Ronyx system</p>
        </div>
        <div className="premium-kpi">
          <span>Active Drivers</span>
          <strong>{loading ? "…" : activeDrivers}</strong>
          <p>Ready or currently assigned</p>
        </div>
        <div className="premium-kpi success">
          <span>Available Now</span>
          <strong>{loading ? "…" : availableDrivers}</strong>
          <p>Ready for dispatch</p>
        </div>
        <div className="premium-kpi blue">
          <span>Assigned</span>
          <strong>{loading ? "…" : assignedDrivers}</strong>
          <p>Currently on load</p>
        </div>
        <div className="premium-kpi danger">
          <span>Compliance Issues</span>
          <strong>{loading ? "…" : documentIssues}</strong>
          <p>Expired or expiring docs</p>
        </div>
      </section>

      <section className="premium-layout">
        <div className="premium-main-column">
          {complianceAlerts.length > 0 && (
            <div className="premium-panel">
              <div className="premium-panel-header">
                <div>
                  <p className="premium-eyebrow">Compliance Watch</p>
                  <h2>Expiring MVRs &amp; Documents</h2>
                  <span>Priority alerts for safety, HR, and dispatch visibility.</span>
                </div>
                <button className="premium-button ghost">Review All</button>
              </div>
              <div className="premium-alert-grid">
                {complianceAlerts.map((alert, i) => (
                  <div
                    key={i}
                    className={alert.level === "critical" ? "premium-alert critical" : "premium-alert warning"}
                  >
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.driver}</p>
                      <span>{alert.detail}</span>
                    </div>
                    <button>Open</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <p className="premium-eyebrow">Driver Directory</p>
                <h2>All Drivers</h2>
                <span>Search, filter, assign, suspend, and manage driver records.</span>
              </div>
            </div>

            <div className="premium-filter-bar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, CDL, email, or truck..."
              />
              <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
                <option>All Statuses</option>
                <option>Active</option>
                <option>Available</option>
                <option>Assigned</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
              <select value={docFilter} onChange={(e) => setDoc(e.target.value)}>
                <option>All Docs</option>
                <option>Good</option>
                <option>Expiring</option>
                <option>Expired</option>
                <option>Missing</option>
                <option>Needs Attention</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>Loading drivers…</div>
            ) : filteredDrivers.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                {allDrivers.length === 0
                  ? "No drivers yet. Click \"+ Add Driver\" to get started."
                  : "No drivers match your filters."}
              </div>
            ) : (
              <div className="premium-driver-list">
                {filteredDrivers.map((driver) => (
                  <article className="premium-driver-card" key={driver.id}>
                    <div className="driver-identity">
                      <div className="driver-avatar">
                        {driver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3>{driver.name}</h3>
                        <p>{driver.role}</p>
                        <span>{driver.location}</span>
                      </div>
                    </div>

                    <div className="driver-data-grid">
                      <div><span>Phone</span><strong>{driver.phone}</strong></div>
                      <div><span>Type</span><strong>{driver.driverType}</strong></div>
                      <div><span>Truck</span><strong>{driver.truck}</strong></div>
                      <div><span>Trailer</span><strong>{driver.trailer}</strong></div>
                      <div><span>CDL</span><strong>{driver.cdl}</strong></div>
                      <div>
                        <span>MVR Exp.</span>
                        <strong className={driver.mvrExp === "Expired" ? "danger-text" : ""}>{driver.mvrExp}</strong>
                      </div>
                      <div>
                        <span>Medical</span>
                        <strong className={driver.medicalExp === "Expired" ? "danger-text" : ""}>{driver.medicalExp}</strong>
                      </div>
                      <div><span>Revenue Week</span><strong>{driver.revenueWeek}</strong></div>
                    </div>

                    <div className="driver-score-strip">
                      <div><span>Rating</span><strong>{driver.rating > 0 ? `★ ${driver.rating}` : "—"}</strong></div>
                      <div><span>Safety</span><strong>{driver.safetyScore}%</strong></div>
                      <div><span>On-Time</span><strong>{driver.onTime}%</strong></div>
                      <div><span>Last Load</span><strong>{driver.lastLoad}</strong></div>
                    </div>

                    <div className="driver-card-footer">
                      <div className="badge-row">
                        <StatusBadge status={driver.status} />
                        <StatusBadge status={driver.docs} />
                      </div>
                      <div className="driver-actions">
                        <Link href={`/ronyx/drivers/${driver.id}`}>
                          <button>Profile</button>
                        </Link>
                        <Link href={`/ronyx/drivers/${driver.id}?tab=documents`}>
                          <button>Documents</button>
                        </Link>
                        <button>Assign</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="premium-side-column">
          <div className="premium-panel">
            <p className="premium-eyebrow">Quick Actions</p>
            <h2>Driver Tools</h2>
            <div className="quick-action-list">
              <Link href="/ronyx/drivers/new" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Add New Driver</button>
              </Link>
              <button>Send Login Invite</button>
              <button>Upload MVR</button>
              <button>Upload Medical Card</button>
              <button>Assign Truck</button>
              <button>Create Driver Resume</button>
              <Link href="/ronyx/payroll" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Open Payroll Summary</button>
              </Link>
            </div>
          </div>

          <div className="premium-panel dark-panel">
            <p className="premium-eyebrow">AI Dispatch Insight</p>
            <h2>Recommended Actions</h2>
            <p>
              {documentIssues > 0
                ? `${documentIssues} driver${documentIssues > 1 ? "s have" : " has"} compliance docs that need attention before next dispatch.`
                : "All driver compliance docs are current. Fleet is ready for dispatch."}
            </p>
            <Link href="/ronyx/hr-compliance" style={{ textDecoration: "none" }}>
              <button className="premium-button primary full">Run Compliance Review</button>
            </Link>
          </div>

          {topDriver && (
            <div className="premium-panel">
              <p className="premium-eyebrow">Driver Performance</p>
              <h2>Top Driver</h2>
              <div className="top-driver-box">
                <div className="driver-avatar large">
                  {topDriver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <h3>{topDriver.name}</h3>
                <p>
                  {topDriver.rating > 0 ? `★ ${topDriver.rating} rating` : "No rating yet"} · {topDriver.truck}
                </p>
                <StatusBadge status={topDriver.docs} />
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
