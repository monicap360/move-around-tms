"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EMPTY = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
  driver_type: "W2",
  position_role: "",
  license_number: "",
  license_state: "",
  license_expiration_date: "",
  mvr_expiration: "",
  medical_card_expiration: "",
  hire_date: "",
  pay_rate: "",
  assigned_truck_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  supervisor_name: "",
};

type Form = typeof EMPTY;

function Field({
  label,
  required,
  fullWidth,
  children,
}: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: "0.73rem", fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <h3 style={{ margin: 0, fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
        {children}
      </div>
    </div>
  );
}

export default function NewDriverPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): string | null {
    if (!form.full_name.trim()) return "Full name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Enter a valid email address.";
    if (form.license_expiration_date && isNaN(Date.parse(form.license_expiration_date)))
      return "CDL expiration date is invalid.";
    if (form.mvr_expiration && isNaN(Date.parse(form.mvr_expiration)))
      return "MVR expiration date is invalid.";
    if (form.medical_card_expiration && isNaN(Date.parse(form.medical_card_expiration)))
      return "Medical card expiration date is invalid.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/ronyx/drivers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save driver.");
        return;
      }
      // Fire-and-forget Excel email to admin
      fetch("/api/ronyx/drivers/notify-excel", { method: "POST" }).catch(() => {});
      router.push(`/ronyx/drivers/${data.driver.id}?new=1`);
    } catch (e: any) {
      setError(e?.message || "Unexpected error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: "0.88rem",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };
  const sel: React.CSSProperties = { ...inp, cursor: "pointer" };

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Breadcrumb / header */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/ronyx/drivers" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>
          ← Back to Drivers
        </Link>
        <h1 style={{ margin: "8px 0 4px", fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>Add Driver</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
          Fill in the driver's information. You can upload documents and assign a truck after saving.
        </p>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: "0.85rem", fontWeight: 500 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Section title="Personal Information">
          <Field label="Full Name" required>
            <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} style={inp} placeholder="John Smith" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={sel}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inp} placeholder="(555) 000-0000" type="tel" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => set("email", e.target.value)} style={inp} placeholder="john@example.com" type="email" />
          </Field>
          <Field label="Home Address" fullWidth>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} style={inp} placeholder="Street, City, State ZIP" />
          </Field>
        </Section>

        <Section title="Employment">
          <Field label="Driver Type">
            <select value={form.driver_type} onChange={(e) => set("driver_type", e.target.value)} style={sel}>
              <option value="W2">W2 Employee</option>
              <option value="1099">1099 Contractor</option>
              <option value="owner_operator">Owner Operator</option>
            </select>
          </Field>
          <Field label="Position / Role">
            <input value={form.position_role} onChange={(e) => set("position_role", e.target.value)} style={inp} placeholder="CDL Driver, Dispatcher…" />
          </Field>
          <Field label="Hire Date">
            <input value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} style={inp} type="date" />
          </Field>
          <Field label="Supervisor">
            <input value={form.supervisor_name} onChange={(e) => set("supervisor_name", e.target.value)} style={inp} placeholder="Supervisor name" />
          </Field>
          <Field label="Assigned Truck #">
            <input value={form.assigned_truck_number} onChange={(e) => set("assigned_truck_number", e.target.value)} style={inp} placeholder="Unit 214" />
          </Field>
        </Section>

        <Section title="License & Compliance">
          <Field label="CDL Number">
            <input value={form.license_number} onChange={(e) => set("license_number", e.target.value)} style={inp} placeholder="TX1234567" />
          </Field>
          <Field label="CDL State">
            <input value={form.license_state} onChange={(e) => set("license_state", e.target.value)} style={inp} placeholder="TX" maxLength={2} />
          </Field>
          <Field label="CDL Expiration">
            <input value={form.license_expiration_date} onChange={(e) => set("license_expiration_date", e.target.value)} style={inp} type="date" />
          </Field>
          <Field label="MVR Expiration">
            <input value={form.mvr_expiration} onChange={(e) => set("mvr_expiration", e.target.value)} style={inp} type="date" />
          </Field>
          <Field label="Medical Card Expiration">
            <input value={form.medical_card_expiration} onChange={(e) => set("medical_card_expiration", e.target.value)} style={inp} type="date" />
          </Field>
        </Section>

        <Section title="Compensation">
          <Field label="Pay Rate ($/hr or $/mile)">
            <input value={form.pay_rate} onChange={(e) => set("pay_rate", e.target.value)} style={inp} placeholder="0.00" type="number" step="0.01" min="0" />
          </Field>
        </Section>

        <Section title="Emergency Contact">
          <Field label="Contact Name">
            <input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} style={inp} placeholder="Jane Smith" />
          </Field>
          <Field label="Contact Phone">
            <input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} style={inp} placeholder="(555) 000-0001" type="tel" />
          </Field>
        </Section>

        <div style={{ display: "flex", gap: 12, marginTop: 4, paddingBottom: 32 }}>
          <button
            type="submit"
            disabled={saving}
            style={{ background: saving ? "#93c5fd" : "#1e40af", color: "#fff", padding: "10px 32px", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "Save Driver"}
          </button>
          <Link
            href="/ronyx/drivers"
            style={{ padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", color: "#475569", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
