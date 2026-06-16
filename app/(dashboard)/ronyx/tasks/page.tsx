"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Priority = "critical" | "high" | "normal" | "low";
type Status   = "open" | "in_progress" | "completed" | "cancelled" | "waiting" | "blocked";
type Assignee = "CCB" | "Sylvia" | "Team" | "All";

type Task = {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigned_to_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  owner_operator_name: string | null;
  document_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  source_type: string | null;
  source_label: string | null;
  initials_required: boolean;
  notes: string | null;
  created_at: string;
};

type Counts = Record<string, number>;

/* ─── Config ─────────────────────────────────────────────────────────────── */
const TABS: Assignee[] = ["CCB", "Sylvia", "Team", "All"];

const ASSIGNEE_CONFIG: Record<Assignee, { color: string; bg: string; emoji: string; desc: string }> = {
  CCB:    { color: "#1d4ed8", bg: "#eff6ff",  emoji: "🛡️", desc: "Insurance & COI" },
  Sylvia: { color: "#7c3aed", bg: "#f5f3ff",  emoji: "📋", desc: "CDL & Compliance Docs" },
  Team:   { color: "#0891b2", bg: "#f0f9ff",  emoji: "👥", desc: "General Operations" },
  All:    { color: "#475569", bg: "#f8fafc",  emoji: "📌", desc: "All Open Tasks" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: "Critical", color: "#dc2626", bg: "#fff1f2", dot: "#dc2626" },
  high:     { label: "High",     color: "#ea580c", bg: "#fff7ed", dot: "#ea580c" },
  normal:   { label: "Normal",   color: "#d97706", bg: "#fefce8", dot: "#d97706" },
  low:      { label: "Low",      color: "#64748b", bg: "#f8fafc", dot: "#94a3b8" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "#1d4ed8", bg: "#eff6ff" },
  in_progress: { label: "In Progress", color: "#d97706", bg: "#fefce8" },
  completed:   { label: "Done",        color: "#15803d", bg: "#f0fdf4" },
  cancelled:   { label: "Cancelled",   color: "#64748b", bg: "#f8fafc" },
  waiting:     { label: "Waiting",     color: "#7c3aed", bg: "#f5f3ff" },
  blocked:     { label: "Blocked",     color: "#dc2626", bg: "#fff1f2" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function daysUntil(d?: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

/* ─── TaskCard ────────────────────────────────────────────────────────────── */
function TaskCard({
  task,
  showTab,
  onUpdate,
}: {
  task: Task;
  showTab: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [initials,    setInitials]    = useState("");
  const [doneNote,    setDoneNote]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [reassignTo,  setReassignTo]  = useState("");

  const isDone    = task.status === "completed" || task.status === "cancelled";
  const pCfg      = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const sCfg      = STATUS_CONFIG[task.status]     || STATUS_CONFIG.open;
  const dueDays   = daysUntil(task.due_date);
  const dueColor  = dueDays === null ? "#94a3b8" : dueDays < 0 ? "#dc2626" : dueDays <= 2 ? "#ea580c" : dueDays <= 7 ? "#d97706" : "#64748b";
  const assigneeCfg = task.assigned_to_name ? ASSIGNEE_CONFIG[task.assigned_to_name as Assignee] : null;

  async function markDone() {
    if (task.initials_required && !initials.trim()) {
      alert("Please enter your initials to complete this task.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/ronyx/staff-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status:           "completed",
        completed_by:     initials.trim() || "Staff",
        completion_notes: doneNote.trim() || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdate(task.id, { status: "completed", completed_by: initials.trim(), completed_at: data.task.completed_at });
      setExpanded(false);
    }
    setSaving(false);
  }

  async function setStatus(status: Status) {
    setSaving(true);
    const res = await fetch(`/api/ronyx/staff-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) onUpdate(task.id, { status: data.task.status });
    setSaving(false);
  }

  async function reassign() {
    if (!reassignTo) return;
    setSaving(true);
    const res = await fetch(`/api/ronyx/staff-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to_name: reassignTo }),
    });
    const data = await res.json();
    if (res.ok) onUpdate(task.id, { assigned_to_name: data.task.assigned_to_name });
    setReassignTo(""); setSaving(false);
  }

  return (
    <div style={{
      background: isDone ? "#f8fafc" : "#fff",
      border: `1.5px solid ${isDone ? "#e2e8f0" : task.priority === "critical" ? "#fda4af" : "#e2e8f0"}`,
      borderLeft: `4px solid ${isDone ? "#cbd5e1" : pCfg.dot}`,
      borderRadius: 12,
      marginBottom: 8,
      opacity: isDone ? 0.65 : 1,
      transition: "all 0.15s",
    }}>
      {/* ── Row ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", cursor: "pointer" }}
      >
        {/* Priority dot */}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: pCfg.dot, flexShrink: 0, marginTop: 5 }} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: isDone ? "#94a3b8" : "#0f172a", fontSize: "0.9rem", textDecoration: isDone ? "line-through" : "none" }}>
              {task.title}
            </span>
            <span style={{ background: sCfg.bg, color: sCfg.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
              {sCfg.label}
            </span>
            <span style={{ background: pCfg.bg, color: pCfg.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
              {pCfg.label}
            </span>
            {showTab && assigneeCfg && (
              <span style={{ background: assigneeCfg.bg, color: assigneeCfg.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
                {task.assigned_to_name}
              </span>
            )}
          </div>
          <div style={{ marginTop: 3, fontSize: "0.78rem", color: "#64748b", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {task.source_label  && <span>📥 {task.source_label}</span>}
            {task.owner_operator_name && <span>🚛 {task.owner_operator_name}</span>}
            {task.document_type && <span>📄 {task.document_type}</span>}
            {task.due_date && (
              <span style={{ color: dueColor, fontWeight: 600 }}>
                {dueDays !== null && dueDays < 0 ? `⚠ Overdue ${Math.abs(dueDays)}d` : `Due ${fmtDate(task.due_date)}`}
              </span>
            )}
          </div>
          {isDone && task.completed_by && (
            <div style={{ marginTop: 3, fontSize: "0.72rem", color: "#15803d", fontWeight: 600 }}>
              ✅ Done by <strong>{task.completed_by}</strong> · {fmtTime(task.completed_at)}
            </div>
          )}
        </div>

        {/* Expand arrow */}
        <div style={{ fontSize: "0.9rem", color: "#94a3b8", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 16px 16px" }}>
          {task.description && (
            <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
              {task.description}
            </div>
          )}

          {task.notes && (
            <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.8rem", color: "#92400e" }}>
              📝 {task.notes}
            </div>
          )}

          {!isDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Completion form */}
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#15803d", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Mark Complete
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px" }}>
                  <div>
                    <label style={lbl}>Your Initials {task.initials_required && <span style={{ color: "#dc2626" }}>*</span>}</label>
                    <input
                      value={initials}
                      onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="e.g. CCB"
                      maxLength={4}
                      style={{ ...inp, fontWeight: 800, fontSize: "1rem", textAlign: "center", letterSpacing: "0.1em" }}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Completion Note (optional)</label>
                    <input
                      value={doneNote}
                      onChange={e => setDoneNote(e.target.value)}
                      placeholder="e.g. COI received and filed, expires 2027-01-01"
                      style={inp}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={markDone}
                    disabled={saving || (task.initials_required && !initials.trim())}
                    style={{
                      background: saving || (task.initials_required && !initials.trim()) ? "#94a3b8" : "#15803d",
                      color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px",
                      fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.82rem",
                    }}
                  >
                    {saving ? "Saving…" : "✅ Mark Done"}
                  </button>
                  {task.status !== "in_progress" && (
                    <button onClick={() => setStatus("in_progress")} disabled={saving} style={{ ...ghostBtn, fontSize: "0.78rem" }}>
                      Start Working
                    </button>
                  )}
                  <button onClick={() => setStatus("waiting")} disabled={saving} style={{ ...ghostBtn, fontSize: "0.78rem" }}>
                    Mark Waiting
                  </button>
                </div>
              </div>

              {/* Reassign */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Reassign to:</span>
                <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.78rem", background: "#fff" }}>
                  <option value="">— Select —</option>
                  {["CCB", "Sylvia", "Team"].filter(a => a !== task.assigned_to_name).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {reassignTo && <button onClick={reassign} disabled={saving} style={{ ...ghostBtn, fontSize: "0.75rem" }}>Reassign</button>}
              </div>
            </div>
          )}

          {isDone && task.completion_notes && (
            <div style={{ fontSize: "0.8rem", color: "#475569", fontStyle: "italic" }}>
              Note: {task.completion_notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── AddTaskForm ─────────────────────────────────────────────────────────── */
function AddTaskForm({ onAdd }: { onAdd: () => void }) {
  const [show, setShow]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    title: "", description: "", task_type: "general", priority: "high",
    assigned_to_name: "", due_date: "", notes: "",
  });

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/ronyx/staff-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source_type: "manual" }),
    });
    setForm({ title: "", description: "", task_type: "general", priority: "high", assigned_to_name: "", due_date: "", notes: "" });
    setShow(false); setSaving(false); onAdd();
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setShow(s => !s)} style={primaryBtn}>
        {show ? "Cancel" : "+ Add Task"}
      </button>
      {show && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Task Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="e.g. Request updated COI from Smith Trucking" />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} style={inp}>
                {["general","coi_missing","coi_expired","coi_expiring_30d","cdl_expiring","medical_expiring","dispatch_block","payroll_hold","driver_doc","insurance_expired","maintenance"].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp}>
                {["critical","high","normal","low"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Assign To</label>
              <select value={form.assigned_to_name} onChange={e => setForm(f => ({ ...f, assigned_to_name: e.target.value }))} style={inp}>
                <option value="">— Auto-route —</option>
                <option value="CCB">CCB (Insurance)</option>
                <option value="Sylvia">Sylvia (Compliance)</option>
                <option value="Team">Team (General)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Optional — context, steps, or links" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={submit} disabled={saving || !form.title.trim()} style={{ ...primaryBtn, opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Create Task"}
            </button>
            <button onClick={() => setShow(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function StaffTasksPage() {
  const searchParams = useSearchParams();
  const initialTab   = (searchParams.get("tab") as Assignee) || "CCB";
  const [activeTab,    setActiveTab]    = useState<Assignee>(initialTab);
  const [showDone,     setShowDone]     = useState(false);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [counts,       setCounts]       = useState<Counts>({});
  const [loading,      setLoading]      = useState(true);
  const [sweeping,     setSweeping]     = useState(false);
  const [sweepMsg,     setSweepMsg]     = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const status = showDone ? "all" : "open";
    const res    = await fetch(`/api/ronyx/staff-tasks?assignee=${activeTab}&status=${status}&limit=300`);
    const data   = await res.json();
    setTasks(data.tasks || []);
    setCounts(data.counts || {});
    setLoading(false);
  }, [activeTab, showDone]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function onUpdate(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } as Task : t));
    // Refresh counts
    loadTasks();
  }

  async function runSweep() {
    setSweeping(true); setSweepMsg("");
    const res  = await fetch("/api/ronyx/staff-tasks/sweep", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSweepMsg(`Sweep done: ${data.tasks_created} tasks created, ${data.tasks_closed} closed. ${data.drivers_scanned} drivers scanned.`);
      loadTasks();
    } else {
      setSweepMsg("Sweep failed — check console.");
    }
    setSweeping(false);
    setTimeout(() => setSweepMsg(""), 8000);
  }

  const cfg = ASSIGNEE_CONFIG[activeTab];
  const openTasks = tasks.filter(t => !["completed","cancelled"].includes(t.status));
  const doneTasks = tasks.filter(t =>  ["completed","cancelled"].includes(t.status));

  const filtered = (list: Task[]) =>
    filterPriority === "all" ? list : list.filter(t => t.priority === filterPriority);

  const totalOpen = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>RONYX TMS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Staff To-Do Lists</h1>
          {totalOpen > 0 && (
            <span style={{ background: "#fff1f2", color: "#dc2626", padding: "4px 12px", borderRadius: 20, fontWeight: 800, fontSize: "0.82rem" }}>
              {totalOpen} open
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
          Tasks are auto-routed: insurance → CCB · CDL/docs → Sylvia · operations → Team
        </p>
      </div>

      {/* Sweep banner */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <button
          onClick={runSweep}
          disabled={sweeping}
          style={{ background:sweeping?"#94a3b8":"#0f172a", color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", fontWeight:700, cursor:sweeping?"not-allowed":"pointer", fontSize:"0.8rem" }}
        >
          {sweeping ? "Scanning…" : "🔄 Sync Compliance Tasks"}
        </button>
        <span style={{ fontSize:"0.75rem", color:"#64748b" }}>Scans all active drivers for expired/expiring CDL, medical cards, MVR, and drug tests</span>
        {sweepMsg && <span style={{ fontSize:"0.78rem", color:"#15803d", fontWeight:600 }}>✅ {sweepMsg}</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map(tab => {
          const c = ASSIGNEE_CONFIG[tab];
          const cnt = tab === "All" ? totalOpen : (counts[tab] || 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: activeTab === tab ? 800 : 500,
                color: activeTab === tab ? c.color : "#64748b",
                borderBottom: activeTab === tab ? `3px solid ${c.color}` : "3px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <span>{c.emoji}</span>
              <span>{tab}</span>
              {cnt > 0 && (
                <span style={{ background: activeTab === tab ? c.color : "#e2e8f0", color: activeTab === tab ? "#fff" : "#475569", borderRadius: 20, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 800 }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}22`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.2rem" }}>{cfg.emoji}</span>
        <div>
          <span style={{ fontWeight: 800, color: cfg.color }}>{activeTab === "All" ? "All Staff" : activeTab}</span>
          <span style={{ color: "#64748b", fontSize: "0.82rem", marginLeft: 8 }}>{cfg.desc}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.78rem", background: "#fff" }}>
            <option value="all">All Priorities</option>
            {["critical","high","normal","low"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Add Task */}
      <AddTaskForm onAdd={loadTasks} />

      {/* Open tasks */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading tasks…</div>
      ) : filtered(openTasks).length === 0 ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>✅</div>
          <div style={{ fontWeight: 700, color: "#15803d" }}>
            {activeTab === "All" ? "No open tasks." : `${activeTab}'s list is clear.`}
          </div>
          <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 4 }}>All caught up — use the button above to add a manual task.</div>
        </div>
      ) : (
        <div>
          {filtered(openTasks).map(task => (
            <TaskCard key={task.id} task={task} showTab={activeTab === "All"} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {/* Completed toggle */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setShowDone(s => !s)}
          style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", color: "#64748b", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
        >
          {showDone ? "▲ Hide Completed" : `▼ Show Completed (${doneTasks.length})`}
        </button>

        {showDone && doneTasks.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Completed</div>
            {filtered(doneTasks).map(task => (
              <TaskCard key={task.id} task={task} showTab={activeTab === "All"} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  background: "#1e40af", color: "#fff", border: "none", borderRadius: 8,
  padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer",
};
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#475569",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
};
