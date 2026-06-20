"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

type FieldType = "text"|"number"|"date"|"dropdown"|"multi_select"|"checkbox"|"currency"|"attachment"|"formula";
type EntityType = "jobs"|"tickets"|"customers"|"drivers"|"trucks"|"owner_operators"|"invoices"|"payroll_invoices"|"maintenance_work_orders";

interface CustomField {
  id:           string;
  entity_type:  EntityType;
  field_key:    string;
  label:        string;
  field_type:   FieldType;
  options:      string[] | null;
  placeholder:  string | null;
  help_text:    string | null;
  is_required:  boolean;
  is_active:    boolean;
  sort_order:   number;
  created_at:   string;
}

interface ModalState {
  mode:          "create" | "edit";
  id?:           string;
  label:         string;
  field_type:    FieldType;
  options_text:  string;
  placeholder:   string;
  help_text:     string;
  is_required:   boolean;
  saving:        boolean;
  error:         string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const ENTITIES: { key: EntityType; label: string; icon: string; color: string }[] = [
  { key: "jobs",                   label: "Jobs",                  icon: "📋", color: "#1d4ed8" },
  { key: "tickets",                label: "Tickets",               icon: "🎫", color: "#0891b2" },
  { key: "customers",              label: "Customers",             icon: "🏢", color: "#7c3aed" },
  { key: "drivers",                label: "Drivers",               icon: "🚗", color: "#16a34a" },
  { key: "trucks",                 label: "Trucks",                icon: "🚛", color: "#d97706" },
  { key: "owner_operators",        label: "Owner Operators",       icon: "👤", color: "#dc2626" },
  { key: "invoices",               label: "Invoices",              icon: "💰", color: "#0891b2" },
  { key: "payroll_invoices",       label: "Payroll Invoices",      icon: "💵", color: "#16a34a" },
  { key: "maintenance_work_orders",label: "Maintenance Work Orders",icon: "🔧", color: "#d97706" },
];

const FIELD_TYPES: { value: FieldType; label: string; icon: string; desc: string }[] = [
  { value: "text",         label: "Text",         icon: "T",  desc: "Short or long text entry" },
  { value: "number",       label: "Number",       icon: "#",  desc: "Integer or decimal" },
  { value: "date",         label: "Date",         icon: "📅", desc: "Date picker" },
  { value: "dropdown",     label: "Dropdown",     icon: "▼",  desc: "Select one from a list" },
  { value: "multi_select", label: "Multi-Select", icon: "☑",  desc: "Select multiple from a list" },
  { value: "checkbox",     label: "Checkbox",     icon: "✓",  desc: "True / False toggle" },
  { value: "currency",     label: "Currency",     icon: "$",  desc: "Dollar amount with 2 decimals" },
  { value: "attachment",   label: "Attachment",   icon: "📎", desc: "File upload" },
  { value: "formula",      label: "Formula",      icon: "=",  desc: "Calculated from other fields" },
];

const FONT  = "'Inter','Segoe UI',sans-serif";
const BLUE  = "#1d4ed8";
const DARK  = "#0f172a";
const MED   = "#475569";
const LIGHT = "#64748b";
const BORD  = "#e2e8f0";
const WHITE = "#fff";

const EMPTY_MODAL: ModalState = {
  mode: "create", label: "", field_type: "text",
  options_text: "", placeholder: "", help_text: "",
  is_required: false, saving: false, error: "",
};

/* ── Field type badge ────────────────────────────────────────────── */

function TypeBadge({ type }: { type: FieldType }) {
  const ft = FIELD_TYPES.find(f => f.value === type);
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      background: "#f1f5f9", color: MED, border: `1px solid ${BORD}`,
    }}>
      {ft?.icon} {ft?.label}
    </span>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function CustomFieldsPage() {
  const [entity, setEntity]     = useState<EntityType>("jobs");
  const [fields, setFields]     = useState<CustomField[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<ModalState | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load(entityType = entity) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ronyx/settings/custom-fields?entity=${entityType}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setFields(d.fields || []);
    } catch (e: any) {
      showToast(e.message || "Failed to load fields.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(entity); }, [entity]);

  const entityMeta = ENTITIES.find(e => e.key === entity)!;

  /* ── Save field (create or update) ── */
  async function saveField() {
    if (!modal) return;
    if (!modal.label.trim()) {
      setModal(m => m ? { ...m, error: "Label is required." } : m);
      return;
    }
    if (["dropdown","multi_select"].includes(modal.field_type)) {
      const opts = modal.options_text.split("\n").map(s => s.trim()).filter(Boolean);
      if (opts.length === 0) {
        setModal(m => m ? { ...m, error: "Add at least one option (one per line)." } : m);
        return;
      }
    }

    setModal(m => m ? { ...m, saving: true, error: "" } : m);

    const opts = ["dropdown","multi_select"].includes(modal.field_type)
      ? modal.options_text.split("\n").map(s => s.trim()).filter(Boolean)
      : null;

    try {
      let res: Response;
      if (modal.mode === "create") {
        res = await fetch("/api/ronyx/settings/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_type:  entity,
            label:        modal.label.trim(),
            field_type:   modal.field_type,
            options:      opts,
            placeholder:  modal.placeholder.trim() || null,
            help_text:    modal.help_text.trim()   || null,
            is_required:  modal.is_required,
          }),
        });
      } else {
        res = await fetch(`/api/ronyx/settings/custom-fields/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label:       modal.label.trim(),
            field_type:  modal.field_type,
            options:     opts,
            placeholder: modal.placeholder.trim() || null,
            help_text:   modal.help_text.trim()   || null,
            is_required: modal.is_required,
          }),
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setModal(null);
      showToast(modal.mode === "create" ? "Field created." : "Field updated.");
      await load(entity);
    } catch (e: any) {
      setModal(m => m ? { ...m, saving: false, error: e.message || "Save failed." } : m);
    }
  }

  /* ── Delete ── */
  async function deleteField(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/ronyx/settings/custom-fields/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Field deleted.");
      await load(entity);
    } catch (e: any) {
      showToast(e.message || "Delete failed.", false);
    } finally {
      setDeleting(null);
    }
  }

  /* ── Toggle active ── */
  async function toggleActive(field: CustomField) {
    try {
      const res = await fetch(`/api/ronyx/settings/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !field.is_active }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(field.is_active ? "Field hidden." : "Field activated.");
      await load(entity);
    } catch (e: any) {
      showToast(e.message || "Toggle failed.", false);
    }
  }

  const active   = fields.filter(f => f.is_active);
  const inactive = fields.filter(f => !f.is_active);

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, maxWidth: 1100, margin: "0 auto", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/ronyx/settings" style={{ fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>
          ← Admin Control Center
        </Link>
        <span style={{ color: "#cbd5e1" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Custom Fields</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: "1.45rem", fontWeight: 900, color: DARK, letterSpacing: "-0.5px", marginBottom: 4 }}>
          Custom Fields
        </div>
        <div style={{ fontSize: 13, color: LIGHT, maxWidth: 660 }}>
          Add fields to any entity without code. Fields appear in forms and exports for your organization only.
        </div>
      </div>

      {/* Info panel */}
      <div style={{
        background: "linear-gradient(135deg,#eff6ff,#f0f9ff)", border: "1px solid #bfdbfe",
        borderRadius: 12, padding: "14px 18px", marginBottom: 22,
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12,
      }}>
        {[
          { icon: "📋", text: "Job fields: Pit PO, Foreman Name, Reference Code" },
          { icon: "🎫", text: "Ticket fields: Scale House #, Load Sequence" },
          { icon: "🚗", text: "Driver fields: Union Local, Hire Date, Background Check" },
          { icon: "🚛", text: "Truck fields: Bed Type, Lease Company, Net Payload" },
        ].map(item => (
          <div key={item.text} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: 11.5, color: "#1e40af", lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}>

        {/* Entity sidebar */}
        <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "10px 0", height: "fit-content" }}>
          {ENTITIES.map(e => {
            const active = e.key === entity;
            return (
              <button
                key={e.key}
                onClick={() => setEntity(e.key)}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 16px",
                  background: active ? `${e.color}10` : "none",
                  border: "none", borderLeft: active ? `3px solid ${e.color}` : "3px solid transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: FONT,
                }}
              >
                <span style={{ fontSize: 14 }}>{e.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? e.color : MED }}>
                  {e.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main panel */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: WHITE, border: `1px solid ${BORD}`, borderRadius: "12px 12px 0 0",
            padding: "14px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{entityMeta.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: DARK }}>{entityMeta.label} Fields</div>
                <div style={{ fontSize: 11, color: LIGHT }}>{active.length} active{inactive.length > 0 ? `, ${inactive.length} hidden` : ""}</div>
              </div>
            </div>
            <button
              onClick={() => setModal({ ...EMPTY_MODAL })}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: entityMeta.color, color: WHITE, fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", fontFamily: FONT,
              }}
            >
              + Add Field
            </button>
          </div>

          {loading ? (
            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "40px", textAlign: "center", color: LIGHT }}>
              Loading…
            </div>
          ) : (
            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
              {active.length === 0 && inactive.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{entityMeta.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 6 }}>No custom fields yet</div>
                  <div style={{ fontSize: 12.5, color: LIGHT, maxWidth: 320, margin: "0 auto 20px" }}>
                    Add fields to {entityMeta.label.toLowerCase()} that are specific to how your operation works.
                  </div>
                  <button
                    onClick={() => setModal({ ...EMPTY_MODAL })}
                    style={{
                      padding: "9px 22px", borderRadius: 8, border: "none",
                      background: entityMeta.color, color: WHITE,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                    }}
                  >
                    Add First Field
                  </button>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                      {["Label","Key","Type","Required","Status",""].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...active, ...inactive].map((f, i) => (
                      <tr key={f.id} style={{ borderBottom: i < fields.length - 1 ? `1px solid ${BORD}` : "none", opacity: f.is_active ? 1 : 0.55 }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: DARK }}>{f.label}</div>
                          {f.help_text && <div style={{ fontSize: 11, color: LIGHT, marginTop: 2 }}>{f.help_text}</div>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <code style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, color: MED }}>{f.field_key}</code>
                        </td>
                        <td style={{ padding: "12px 16px" }}><TypeBadge type={f.field_type} /></td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: f.is_required ? "#dc2626" : LIGHT }}>
                            {f.is_required ? "Required" : "Optional"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                            background: f.is_active ? "#f0fdf4" : "#f1f5f9",
                            color: f.is_active ? "#16a34a" : LIGHT,
                            border: `1px solid ${f.is_active ? "#86efac" : BORD}`,
                          }}>
                            {f.is_active ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setModal({
                                mode: "edit", id: f.id,
                                label: f.label, field_type: f.field_type,
                                options_text: (f.options || []).join("\n"),
                                placeholder: f.placeholder || "",
                                help_text: f.help_text || "",
                                is_required: f.is_required,
                                saving: false, error: "",
                              })}
                              style={{ fontSize: 11.5, fontWeight: 600, color: BLUE, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(f)}
                              style={{ fontSize: 11.5, fontWeight: 600, color: MED, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              {f.is_active ? "Hide" : "Show"}
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete field "${f.label}"? This cannot be undone.`)) deleteField(f.id); }}
                              disabled={deleting === f.id}
                              style={{ fontSize: 11.5, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              {deleting === f.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: FONT }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{ background: WHITE, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>
                {modal.mode === "create" ? `Add Field — ${entityMeta.label}` : "Edit Field"}
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: LIGHT }}>×</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Label */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Field Label *</label>
                <input
                  value={modal.label}
                  onChange={e => setModal(m => m ? { ...m, label: e.target.value.slice(0, 80) } : m)}
                  placeholder="e.g. Pit PO Number"
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }}
                />
              </div>

              {/* Field type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 7 }}>Field Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
                  {FIELD_TYPES.map(ft => {
                    const sel = modal.field_type === ft.value;
                    return (
                      <button
                        key={ft.value}
                        onClick={() => setModal(m => m ? { ...m, field_type: ft.value } : m)}
                        style={{
                          padding: "8px 8px", borderRadius: 8, cursor: "pointer",
                          border: sel ? `1.5px solid ${BLUE}` : `1px solid ${BORD}`,
                          background: sel ? "#eff6ff" : WHITE,
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                          fontFamily: FONT,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{ft.icon}</span>
                        <span style={{ fontSize: 10.5, fontWeight: sel ? 700 : 500, color: sel ? BLUE : MED }}>{ft.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options for dropdown/multi_select */}
              {["dropdown","multi_select"].includes(modal.field_type) && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>
                    Options <span style={{ color: LIGHT, fontWeight: 400 }}>(one per line)</span>
                  </label>
                  <textarea
                    value={modal.options_text}
                    onChange={e => setModal(m => m ? { ...m, options_text: e.target.value } : m)}
                    placeholder={"Option A\nOption B\nOption C"}
                    rows={4}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: FONT }}
                  />
                </div>
              )}

              {/* Placeholder */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Placeholder Text <span style={{ color: LIGHT, fontWeight: 400 }}>(optional)</span></label>
                <input
                  value={modal.placeholder}
                  onChange={e => setModal(m => m ? { ...m, placeholder: e.target.value } : m)}
                  placeholder="e.g. Enter PO number"
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }}
                />
              </div>

              {/* Help text */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>Help Text <span style={{ color: LIGHT, fontWeight: 400 }}>(optional)</span></label>
                <input
                  value={modal.help_text}
                  onChange={e => setModal(m => m ? { ...m, help_text: e.target.value } : m)}
                  placeholder="Short instruction shown below the field"
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: FONT }}
                />
              </div>

              {/* Required toggle */}
              <div
                onClick={() => setModal(m => m ? { ...m, is_required: !m.is_required } : m)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  padding: "10px 14px", background: modal.is_required ? "#fef2f2" : "#f8fafc",
                  border: `1px solid ${modal.is_required ? "#fca5a5" : BORD}`, borderRadius: 8, marginBottom: 16,
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, position: "relative",
                  background: modal.is_required ? "#dc2626" : "#94a3b8", transition: "background 0.2s", flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: 2, left: modal.is_required ? 17 : 2,
                    width: 16, height: 16, borderRadius: "50%", background: WHITE,
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: modal.is_required ? "#dc2626" : MED }}>
                    {modal.is_required ? "Required field" : "Optional field"}
                  </div>
                  <div style={{ fontSize: 11, color: LIGHT }}>
                    {modal.is_required ? "Staff must fill this in before saving." : "Staff can leave this blank."}
                  </div>
                </div>
              </div>

              {modal.error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#dc2626", marginBottom: 14 }}>
                  {modal.error}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${BORD}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModal(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", color: MED, fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                onClick={saveField}
                disabled={modal.saving}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: modal.saving ? "#93c5fd" : BLUE, fontSize: 13, fontWeight: 700, cursor: modal.saving ? "default" : "pointer", color: WHITE, fontFamily: FONT }}
              >
                {modal.saving ? "Saving…" : modal.mode === "create" ? "Create Field" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? DARK : "#dc2626", color: WHITE, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", fontFamily: FONT }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
