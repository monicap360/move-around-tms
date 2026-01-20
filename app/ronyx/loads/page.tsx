"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LoadRow = {
  id: string;
  status: "LOADING" | "IN TRANSIT" | "ON SITE" | "DELAYED";
  driver: string;
  driverInitials: string;
  route: string;
  material: string;
  weight: string;
  eta: string;
  priority?: "high";
};

type HosDriver = {
  name: string;
  hoursLeft: string;
  pct: number;
  tone: "safe" | "warning" | "critical";
};

type FleetCell = {
  id: number;
  status: "active" | "maintenance" | "inactive";
  driver: string;
  hours?: string;
  issue?: string;
};

export default function RonyxLoadsPage() {
  const [activeFilter, setActiveFilter] = useState("ALL LOADS");
  const [clock, setClock] = useState("");
  const [quickDispatchOpen, setQuickDispatchOpen] = useState(false);
  const [hudMessage, setHudMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [emergencyMode, setEmergencyMode] = useState(false);

  const loadRows: LoadRow[] = [
    {
      id: "LD-4029",
      status: "LOADING",
      driver: "J. Lane",
      driverInitials: "JL",
      route: "Pit 3 → Katy Site",
      material: "12yd Gravel",
      weight: "18.4t",
      eta: "12m",
    },
    {
      id: "LD-4031",
      status: "LOADING",
      driver: "S. Grant",
      driverInitials: "SG",
      route: "Pit 7 → Beltway 8",
      material: "15yd Topsoil",
      weight: "20.1t",
      eta: "8m",
    },
    {
      id: "LD-4021",
      status: "IN TRANSIT",
      driver: "D. Perez",
      driverInitials: "DP",
      route: "Pit 7 → I-45 Jobsite",
      material: "14yd Base",
      weight: "21.0t",
      eta: "14m",
    },
    {
      id: "LD-4018",
      status: "ON SITE",
      driver: "M. Chen",
      driverInitials: "MC",
      route: "Pit 1 → Main St Project",
      material: "18yd Road Base",
      weight: "23.5t",
      eta: "Unload",
    },
    {
      id: "LD-4035",
      status: "IN TRANSIT",
      driver: "A. Rivers",
      driverInitials: "AR",
      route: "Pit 4 → Westside",
      material: "10yd Sand",
      weight: "15.2t",
      eta: "22m",
    },
    {
      id: "LD-4025",
      status: "DELAYED",
      driver: "K. Miles",
      driverInitials: "KM",
      route: "Pit 3 → Thompson Co",
      material: "16yd Gravel",
      weight: "19.9t",
      eta: "45m",
      priority: "high",
    },
  ];

  const fleetCells: FleetCell[] = [
    { id: 1, status: "active", driver: "J. Lane", hours: "9.5/11h" },
    { id: 2, status: "active", driver: "S. Grant", hours: "7.2/11h" },
    { id: 3, status: "active", driver: "D. Perez", hours: "5.2/11h" },
    { id: 4, status: "active", driver: "M. Chen", hours: "10.8/11h" },
    { id: 5, status: "maintenance", driver: "Truck 18", issue: "Due in 3d" },
    { id: 6, status: "active", driver: "K. Miles", hours: "6.4/11h" },
    { id: 7, status: "active", driver: "A. Rivers", hours: "4.8/11h" },
    { id: 8, status: "inactive", driver: "Available" },
    { id: 9, status: "inactive", driver: "Available" },
  ];

  const hosDrivers: HosDriver[] = [
    { name: "D. Perez", hoursLeft: "4h 22m", pct: 62, tone: "safe" },
    { name: "S. Grant", hoursLeft: "1h 10m", pct: 18, tone: "warning" },
    { name: "M. Chen", hoursLeft: "0h 42m", pct: 9, tone: "critical" },
  ];

  const filteredRows = useMemo(() => {
    if (activeFilter === "ALL LOADS") return loadRows;
    if (activeFilter === "LOADING") return loadRows.filter((row) => row.status === "LOADING");
    if (activeFilter === "IN TRANSIT") return loadRows.filter((row) => row.status === "IN TRANSIT");
    if (activeFilter === "ON SITE") return loadRows.filter((row) => row.status === "ON SITE");
    if (activeFilter === "DELAYED") return loadRows.filter((row) => row.status === "DELAYED");
    return loadRows;
  }, [activeFilter, loadRows]);

  const delayedCount = loadRows.filter((row) => row.status === "DELAYED").length;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hudMessage) return;
    const timer = setTimeout(() => setHudMessage(""), 2800);
    return () => clearTimeout(timer);
  }, [hudMessage]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        handleForceRefresh();
      }
      if (event.code === "Escape") {
        setQuickDispatchOpen(false);
      }
      if (event.ctrlKey && event.code === "KeyD") {
        event.preventDefault();
        setQuickDispatchOpen(true);
      }
      if (event.ctrlKey && event.code === "KeyB") {
        event.preventDefault();
        handleBroadcast();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleBroadcast, handleForceRefresh]);

  const handleCommand = useCallback((message: string) => {
    setHudMessage(message);
  }, []);

  const handleBroadcast = useCallback(() => {
    const message = window.prompt("Enter broadcast message:");
    if (!message) return;
    setHudMessage(`BROADCAST: ${message}`);
  }, []);

  const handleForceRefresh = useCallback(() => {
    setLastUpdated(new Date());
    setHudMessage("Manual refresh complete.");
  }, []);

  const handleEmergency = useCallback(() => {
    const confirmed = window.confirm("Emergency stop - confirm to halt all operations?");
    if (!confirmed) return;
    setEmergencyMode(true);
    setHudMessage("EMERGENCY STOP ACTIVATED");
    setTimeout(() => setEmergencyMode(false), 6000);
  }, []);

  return (
    <div className={`ronyx-pro-dispatch ${emergencyMode ? "emergency-mode" : ""}`}>
      <style jsx global>{`
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");
        @import url("https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap");
        :root {
          --dispatch-dark: #0a0e17;
          --dispatch-surface: #141a29;
          --dispatch-elevated: #1c2438;
          --dispatch-border: #2a3349;
          --status-urgent: #ff4757;
          --status-warning: #ffa502;
          --status-ok: #2ed573;
          --status-info: #1e90ff;
          --status-neutral: #70a1ff;
          --text-primary: #f8f9fa;
          --text-secondary: #a4b0be;
          --text-tertiary: #747d8c;
          --gradient-urgent: linear-gradient(135deg, #ff3838 0%, #ff4757 100%);
          --gradient-warning: linear-gradient(135deg, #ff9f1a 0%, #ffa502 100%);
          --gradient-success: linear-gradient(135deg, #00b894 0%, #2ed573 100%);
          --gradient-primary: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
          --shadow-command: 0 8px 30px rgba(0, 0, 0, 0.4);
          --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.25);
          --shadow-hover: 0 6px 20px rgba(30, 144, 255, 0.15);
          --radius-sm: 4px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: "Roboto Mono", "Segoe UI", monospace;
          background: var(--dispatch-dark);
          color: var(--text-primary);
          line-height: 1.5;
          overflow-x: hidden;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        .command-grid {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          grid-template-rows: auto 1fr auto;
          gap: 16px;
          min-height: 100vh;
          padding: 16px;
          max-width: 2400px;
          margin: 0 auto;
        }
        .status-bar {
          grid-column: 1 / -1;
          background: var(--dispatch-surface);
          border-radius: var(--radius-lg);
          padding: 12px 20px;
          border: 1px solid var(--dispatch-border);
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: center;
          box-shadow: var(--shadow-card);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 16px;
          z-index: 100;
        }
        .system-clock {
          font-family: "Roboto Mono", monospace;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          text-shadow: 0 0 10px rgba(30, 144, 255, 0.3);
        }
        .system-clock .ampm {
          font-size: 12px;
          color: var(--text-secondary);
          margin-left: 4px;
        }
        .alert-ticker {
          display: flex;
          align-items: center;
          gap: 16px;
          overflow: hidden;
          white-space: nowrap;
        }
        .ticker-track {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          animation: ticker-scroll 18s linear infinite;
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-40%);
          }
        }
        .ticker-urgent {
          background: rgba(255, 71, 87, 0.1);
          color: var(--status-urgent);
          border: 1px solid rgba(255, 71, 87, 0.3);
        }
        .ticker-warning {
          background: rgba(255, 165, 2, 0.1);
          color: var(--status-warning);
          border: 1px solid rgba(255, 165, 2, 0.3);
        }
        .operations-rail,
        .intelligence-rail {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fleet-status,
        .pit-control,
        .traffic-intel,
        .weather-alerts,
        .hos-monitor {
          background: var(--dispatch-surface);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--dispatch-border);
          box-shadow: var(--shadow-card);
        }
        .fleet-matrix {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }
        .fleet-cell {
          padding: 12px;
          background: var(--dispatch-elevated);
          border-radius: var(--radius-md);
          text-align: center;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .fleet-cell.active {
          border-color: var(--status-ok);
          background: rgba(46, 213, 115, 0.05);
        }
        .fleet-cell.maintenance {
          border-color: var(--status-warning);
          background: rgba(255, 165, 2, 0.05);
        }
        .fleet-cell.inactive {
          border-color: var(--dispatch-border);
          color: var(--text-tertiary);
          background: rgba(112, 161, 255, 0.05);
        }
        .pit-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 16px;
        }
        .pit-slot {
          padding: 16px;
          background: var(--dispatch-elevated);
          border-radius: var(--radius-md);
          position: relative;
        }
        .pit-loading {
          border-left: 3px solid var(--status-ok);
        }
        .pit-waiting {
          border-left: 3px solid var(--status-warning);
        }
        .pit-slot::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: var(--progress, 0%);
          height: 2px;
          background: var(--status-ok);
          transition: width 1s linear;
        }
        .load-board {
          grid-column: 2;
          grid-row: 2;
          background: var(--dispatch-surface);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--dispatch-border);
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .board-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--dispatch-border);
          gap: 16px;
          flex-wrap: wrap;
        }
        .board-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: 8px 16px;
          background: var(--dispatch-elevated);
          border: 1px solid var(--dispatch-border);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn.active {
          background: var(--gradient-primary);
          color: white;
          border-color: transparent;
        }
        .load-table {
          flex: 1;
          overflow: hidden;
          border-radius: var(--radius-md);
          border: 1px solid var(--dispatch-border);
        }
        .table-header,
        .table-row {
          display: grid;
          grid-template-columns: 80px 100px 120px 1fr 120px 120px 120px 120px;
          padding: 12px 16px;
          align-items: center;
        }
        .table-header {
          background: var(--dispatch-elevated);
          border-bottom: 1px solid var(--dispatch-border);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }
        .table-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }
        .table-row:hover {
          background: rgba(30, 144, 255, 0.05);
          border-left: 2px solid var(--status-info);
        }
        .table-row.high-priority {
          background: rgba(255, 71, 87, 0.05);
          border-left: 2px solid var(--status-urgent);
        }
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }
        .status-loading {
          background: var(--status-ok);
          box-shadow: 0 0 8px var(--status-ok);
        }
        .status-transit {
          background: var(--status-info);
          box-shadow: 0 0 8px var(--status-info);
        }
        .status-onsite {
          background: var(--status-neutral);
          box-shadow: 0 0 8px var(--status-neutral);
        }
        .status-delayed {
          background: var(--status-warning);
          box-shadow: 0 0 8px var(--status-warning);
        }
        .driver-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .driver-badge {
          width: 24px;
          height: 24px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: white;
        }
        .route-display {
          font-family: "Roboto Mono", monospace;
          font-size: 13px;
          color: var(--text-primary);
        }
        .eta-warning {
          color: var(--status-warning);
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .action-buttons {
          display: flex;
          gap: 4px;
        }
        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--dispatch-border);
          background: var(--dispatch-elevated);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: var(--status-info);
          color: white;
          border-color: var(--status-info);
          transform: translateY(-1px);
        }
        .route-status-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }
        .route-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--dispatch-elevated);
          border-radius: var(--radius-md);
          border-left: 3px solid transparent;
        }
        .route-item.critical {
          border-left-color: var(--status-urgent);
        }
        .route-item.warning {
          border-left-color: var(--status-warning);
        }
        .route-item.clear {
          border-left-color: var(--status-ok);
        }
        .weather-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 16px;
        }
        .weather-site {
          padding: 12px;
          background: var(--dispatch-elevated);
          border-radius: var(--radius-md);
        }
        .hos-progress-container {
          margin-top: 16px;
        }
        .hos-driver {
          margin-bottom: 12px;
        }
        .hos-bar {
          height: 6px;
          background: var(--dispatch-border);
          border-radius: 3px;
          margin-top: 4px;
          overflow: hidden;
        }
        .hos-progress {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .hos-safe {
          background: var(--status-ok);
        }
        .hos-warning {
          background: var(--status-warning);
        }
        .hos-critical {
          background: var(--status-urgent);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.35);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(255, 71, 87, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
          }
        }
        .command-bar {
          grid-column: 1 / -1;
          grid-row: 3;
          background: var(--dispatch-surface);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          border: 1px solid var(--dispatch-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-card);
          gap: 16px;
          flex-wrap: wrap;
        }
        .command-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .command-btn {
          padding: 10px 20px;
          background: var(--dispatch-elevated);
          border: 1px solid var(--dispatch-border);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .command-btn.primary {
          background: var(--gradient-primary);
          border-color: transparent;
          color: white;
        }
        .command-btn.urgent {
          background: var(--gradient-urgent);
          border-color: transparent;
          color: white;
        }
        .command-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-hover);
        }
        .emergency-mode .status-indicator {
          background: var(--status-urgent);
          box-shadow: 0 0 10px var(--status-urgent);
        }
        .emergency-mode .status-bar {
          border-color: rgba(255, 71, 87, 0.6);
          box-shadow: 0 0 24px rgba(255, 71, 87, 0.2);
        }
        .hud-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1000;
          display: ${hudMessage ? "block" : "none"};
        }
        .hud-alert {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 71, 87, 0.9);
          color: white;
          padding: 24px 48px;
          border-radius: var(--radius-lg);
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          animation: alert-pulse 1s infinite;
          backdrop-filter: blur(10px);
          border: 2px solid white;
        }
        @keyframes alert-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
        .quick-dispatch {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--dispatch-surface);
          border: 1px solid var(--dispatch-border);
          border-radius: var(--radius-lg);
          padding: 30px;
          width: 600px;
          max-width: 90vw;
          z-index: 2000;
          display: ${quickDispatchOpen ? "block" : "none"};
          box-shadow: var(--shadow-command);
        }
        .quick-dispatch-scrim {
          position: fixed;
          inset: 0;
          background: rgba(10, 14, 23, 0.65);
          border: none;
          z-index: 1500;
        }
        .quick-dispatch input {
          width: 100%;
          padding: 12px;
          background: var(--dispatch-elevated);
          border: 1px solid var(--dispatch-border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }
        .performance-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 20px;
        }
        .metric-card {
          background: var(--dispatch-elevated);
          padding: 16px;
          border-radius: var(--radius-md);
          text-align: center;
          border: 1px solid var(--dispatch-border);
        }
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          font-family: "Roboto Mono", monospace;
          margin: 8px 0;
        }
        @media (max-width: 1600px) {
          .command-grid {
            grid-template-columns: 240px 1fr 280px;
          }
          .table-header,
          .table-row {
            grid-template-columns: 70px 90px 100px 1fr 100px 100px 100px 100px;
            font-size: 12px;
          }
        }
        @media (max-width: 1200px) {
          .command-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr auto;
          }
          .operations-rail,
          .intelligence-rail,
          .load-board {
            grid-column: 1;
          }
          .performance-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--dispatch-elevated);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--dispatch-border);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--status-info);
        }
      `}</style>

      <div className="hud-overlay">
        <div className="hud-alert">{hudMessage || "CRITICAL ALERT"}</div>
      </div>

      {quickDispatchOpen && (
        <button
          type="button"
          className="quick-dispatch-scrim"
          onClick={() => setQuickDispatchOpen(false)}
          aria-label="Close quick dispatch"
        />
      )}

      <div className="quick-dispatch">
        <h3 style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fas fa-bolt" /> QUICK DISPATCH
        </h3>
        <div style={{ marginBottom: 20 }}>
          <input type="text" placeholder="Load ID or Customer" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <input type="text" placeholder="From" />
            <input type="text" placeholder="To" />
          </div>
        </div>
        <button
          className="command-btn primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => {
            setQuickDispatchOpen(false);
            handleCommand("Load dispatched successfully.");
          }}
        >
          <i className="fas fa-paper-plane" /> DISPATCH LOAD
        </button>
      </div>

      <div className="command-grid">
        <div className="status-bar">
          <div className="system-clock">
            <span>{clock || "00:00:00"}</span>
            <span className="ampm">EST</span>
          </div>
          <div className="alert-ticker">
            <div className="ticker-track">
              <div className="ticker-item ticker-urgent">
                <i className="fas fa-exclamation-triangle" />
                <span>MAINTENANCE: Truck #18 due in 3 days</span>
              </div>
              <div className="ticker-item ticker-warning">
                <i className="fas fa-clock" />
                <span>DETENTION: LD-4025 (45 min elapsed)</span>
              </div>
              <div className="ticker-item">
                <i className="fas fa-users" />
                <span>SHIFT CHANGE: Evening crew in 45 min</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, background: "var(--status-ok)", borderRadius: "50%" }} />
              <span style={{ fontSize: 13 }}>SYSTEM: ONLINE</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>94.7% ON-TIME</div>
          </div>
        </div>

        <div className="operations-rail">
          <div className="fleet-status">
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-truck" /> FLEET STATUS
            </h3>
            <div className="fleet-matrix">
              {fleetCells.map((cell) => (
                <div
                  key={cell.id}
                  className={`fleet-cell ${
                    cell.status === "maintenance" ? "maintenance" : cell.status === "inactive" ? "inactive" : "active"
                  }`}
                >
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {cell.status === "inactive" ? "—" : cell.id}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {cell.status === "inactive" ? "AVAILABLE" : cell.driver}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      color: cell.status === "maintenance" ? "var(--status-warning)" : "var(--text-secondary)",
                    }}
                  >
                    {cell.issue || cell.hours || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pit-control">
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-mountain" /> PIT CONTROL
            </h3>
            <div className="pit-grid">
              <div className="pit-slot pit-loading" style={{ ["--progress" as string]: "65%" }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>PIT 3</div>
                <div style={{ fontWeight: 600, margin: "4px 0" }}>LD-4029</div>
                <div style={{ fontSize: 12, color: "var(--status-ok)" }}>LOADING • 65%</div>
              </div>
              <div className="pit-slot pit-waiting">
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>PIT 7</div>
                <div style={{ fontWeight: 600, margin: "4px 0" }}>LD-4031</div>
                <div style={{ fontSize: 12, color: "var(--status-warning)" }}>WAITING • 8 min</div>
              </div>
              <div className="pit-slot">
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>PIT 1</div>
                <div style={{ fontWeight: 600, margin: "4px 0" }}>OPEN</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>AVAILABLE</div>
              </div>
              <div className="pit-slot">
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>PIT 4</div>
                <div style={{ fontWeight: 600, margin: "4px 0" }}>LD-4030</div>
                <div style={{ fontSize: 12, color: "var(--status-info)" }}>DISPATCHED</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--dispatch-surface)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              border: "1px solid var(--dispatch-border)",
            }}
          >
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-chart-line" /> PERFORMANCE
            </h3>
            <div className="performance-metrics">
              {[
                { label: "UTILIZATION", value: "78%", trend: "+2.4%", tone: "var(--status-ok)" },
                { label: "AVG LOAD TIME", value: "18m", trend: "+1.2m", tone: "var(--status-warning)" },
                { label: "IDLE TIME", value: "12%", trend: "-1.8%", tone: "var(--status-ok)" },
                { label: "REV/LOAD", value: "$485", trend: "+$24", tone: "var(--status-ok)" },
              ].map((metric) => (
                <div key={metric.label} className="metric-card">
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div style={{ fontSize: 12, color: metric.tone }}>{metric.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="load-board">
          <div className="board-header">
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                LOAD BOARD
                <span
                  style={{
                    fontSize: 13,
                    background: "rgba(30, 144, 255, 0.1)",
                    color: "var(--status-info)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {loadRows.length} LOADS • {delayedCount} DELAYED
                </span>
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
                Updated every 30 seconds • Last: {lastUpdated.toLocaleTimeString("en-US", { hour12: false })}
              </div>
            </div>
            <div className="board-filters">
              {["ALL LOADS", "LOADING", "IN TRANSIT", "ON SITE", "DELAYED"].map((label) => (
                <button
                  key={label}
                  className={`filter-btn ${activeFilter === label ? "active" : ""}`}
                  onClick={() => setActiveFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="load-table">
            <div className="table-header">
              <div>LOAD ID</div>
              <div>STATUS</div>
              <div>DRIVER</div>
              <div>ROUTE</div>
              <div>MATERIAL</div>
              <div>WEIGHT</div>
              <div>ETA/STATUS</div>
              <div>ACTIONS</div>
            </div>
            <div className="table-rows">
              {filteredRows.map((row) => (
                <div key={row.id} className={`table-row ${row.priority === "high" ? "high-priority" : ""}`}>
                  <div>{row.id}</div>
                  <div>
                    <span
                      className={`status-indicator ${
                        row.status === "LOADING"
                          ? "status-loading"
                          : row.status === "IN TRANSIT"
                          ? "status-transit"
                          : row.status === "ON SITE"
                          ? "status-onsite"
                          : "status-delayed"
                      }`}
                    />
                    {row.status}
                  </div>
                  <div className="driver-info">
                    <div className="driver-badge">{row.driverInitials}</div>
                    {row.driver}
                  </div>
                  <div className="route-display">{row.route}</div>
                  <div>{row.material}</div>
                  <div>{row.weight}</div>
                  <div className={row.status === "DELAYED" ? "eta-warning" : undefined}>{row.eta}</div>
                  <div className="action-buttons">
                    <button className="action-btn" onClick={() => handleCommand(`Calling ${row.driver}`)}>
                      <i className="fas fa-phone" />
                    </button>
                    <button className="action-btn" onClick={() => handleCommand(`Tracking ${row.id}`)}>
                      <i className="fas fa-map-marker-alt" />
                    </button>
                    <button className="action-btn" onClick={() => handleCommand(`Message sent to ${row.driver}`)}>
                      <i className="fas fa-message" />
                    </button>
                    <button className="action-btn" onClick={() => handleCommand(`Updated ${row.id}`)}>
                      <i className="fas fa-pen-to-square" />
                    </button>
                    {row.status === "IN TRANSIT" || row.status === "DELAYED" ? (
                      <button className="action-btn" onClick={() => handleCommand(`Reroute queued for ${row.id}`)}>
                        <i className="fas fa-route" />
                      </button>
                    ) : (
                      <button className="action-btn" onClick={() => handleCommand(`Ticket ready for ${row.id}`)}>
                        <i className="fas fa-file-invoice" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="intelligence-rail">
          <div className="traffic-intel">
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-traffic-light" /> TRAFFIC INTELLIGENCE
            </h3>
            <div className="route-status-grid">
              <div className="route-item critical">
                <span>I-45 NORTH</span>
                <span style={{ color: "var(--status-urgent)", fontWeight: 600 }}>HEAVY</span>
              </div>
              <div className="route-item clear">
                <span>BELTWAY 8</span>
                <span style={{ color: "var(--status-ok)", fontWeight: 600 }}>CLEAR</span>
              </div>
              <div className="route-item warning">
                <span>HIGHWAY 290</span>
                <span style={{ color: "var(--status-warning)", fontWeight: 600 }}>MODERATE</span>
              </div>
              <div className="route-item clear">
                <span>I-10 WEST</span>
                <span style={{ color: "var(--status-ok)", fontWeight: 600 }}>CLEAR</span>
              </div>
            </div>
          </div>

          <div className="weather-alerts">
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-cloud-sun" /> WEATHER ALERTS
            </h3>
            <div className="weather-grid">
              <div className="weather-site">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>MAIN ST PROJECT</div>
                <div style={{ fontSize: 13, color: "var(--status-ok)" }}>CLEAR • 68°F</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>SITE CLOSES 3PM</div>
              </div>
              <div className="weather-site">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>KATY SITE</div>
                <div style={{ fontSize: 13, color: "var(--status-warning)" }}>RAIN IN 45m</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>PREPARE TARPS</div>
              </div>
              <div className="weather-site">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>I-45 JOBSITE</div>
                <div style={{ fontSize: 13, color: "var(--status-ok)" }}>CLEAR • 72°F</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>DRY CONDITIONS</div>
              </div>
              <div className="weather-site">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>WESTSIDE</div>
                <div style={{ fontSize: 13, color: "var(--status-ok)" }}>CLEAR • 70°F</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>NORMAL OPS</div>
              </div>
            </div>
          </div>

          <div className="hos-monitor">
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fas fa-hourglass-half" /> HOS MONITOR
            </h3>
            <div className="hos-progress-container">
              {hosDrivers.map((driver) => (
                <div key={driver.name} className="hos-driver">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>{driver.name}</span>
                    <span>{driver.hoursLeft}</span>
                  </div>
                  <div className="hos-bar">
                    <div className={`hos-progress hos-${driver.tone}`} style={{ width: `${driver.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="command-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, background: "var(--status-info)", borderRadius: "50%" }} />
              <span style={{ fontSize: 13 }}>COMM: ACTIVE • 18/24 TRUCKS ONLINE</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>FUEL PRICE: $3.85/gal (-0.02)</div>
          </div>
          <div className="command-buttons">
            <button className="command-btn" onClick={() => setQuickDispatchOpen(true)}>
              <i className="fas fa-bolt" /> Quick Dispatch
            </button>
            <button className="command-btn" onClick={handleBroadcast}>
              <i className="fas fa-broadcast-tower" /> Broadcast
            </button>
            <button className="command-btn primary" onClick={handleForceRefresh}>
              <i className="fas fa-sync-alt" /> Force Refresh
            </button>
            <button className="command-btn urgent" onClick={handleEmergency}>
              <i className="fas fa-triangle-exclamation" /> Emergency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
