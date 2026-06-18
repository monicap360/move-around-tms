"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock" | "pre_order";

type StoreProduct = {
  id: string;
  organization_id: string;
  title: string;
  category: string;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  sizes: string[];
  colors: string[];
  sku: string | null;
  image_url: string | null;
  image_alt: string | null;
  shopify_product_url: string | null;
  shopify_product_id: string | null;
  buy_button_embed: string | null;
  is_active: boolean;
  inventory_status: InventoryStatus;
  inventory_count: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type StoreSettings = {
  id: string | null;
  organization_id: string;
  store_name: string;
  store_enabled: boolean;
  shopify_store_url: string | null;
  shopify_embed_code: string | null;
  embed_mode: "link" | "buy_button" | "iframe";
  shopify_shop_domain: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ModalMode = null | "add" | StoreProduct;

const ALL_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

const CATEGORIES = [
  "Hoodie / Company Merch",
  "T-Shirt",
  "Hat / Cap",
  "Jacket",
  "Accessories",
  "Safety Gear",
  "Other",
];

const INVENTORY_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: "in_stock",      label: "In Stock" },
  { value: "low_stock",     label: "Low Stock" },
  { value: "out_of_stock",  label: "Out of Stock" },
  { value: "pre_order",     label: "Pre-Order" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function inventoryBadge(status: InventoryStatus): { label: string; bg: string; color: string } {
  switch (status) {
    case "in_stock":     return { label: "In Stock",      bg: "#dcfce7", color: "#15803d" };
    case "low_stock":    return { label: "Low Stock",     bg: "#fef9c3", color: "#a16207" };
    case "out_of_stock": return { label: "Out of Stock",  bg: "#fee2e2", color: "#dc2626" };
    case "pre_order":    return { label: "Pre-Order",     bg: "#dbeafe", color: "#1d4ed8" };
    default:             return { label: status,          bg: "#f1f5f9", color: "#475569" };
  }
}

function copyToClipboard(text: string, onDone?: () => void) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onDone).catch(() => {});
  } else {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    onDone?.();
  }
}

// ── Empty form state ──────────────────────────────────────────────────────────

function emptyForm() {
  return {
    title:               "",
    category:            "Hoodie / Company Merch",
    description:         "",
    price:               "",
    compare_at_price:    "",
    sizes:               [] as string[],
    colors:              "",
    sku:                 "",
    image_url:           "",
    shopify_product_url: "",
    buy_button_embed:    "",
    inventory_status:    "in_stock" as InventoryStatus,
    inventory_count:     "",
    is_active:           true,
  };
}

type FormState = ReturnType<typeof emptyForm>;

function productToForm(p: StoreProduct): FormState {
  return {
    title:               p.title,
    category:            p.category,
    description:         p.description || "",
    price:               p.price != null ? String(p.price) : "",
    compare_at_price:    p.compare_at_price != null ? String(p.compare_at_price) : "",
    sizes:               p.sizes || [],
    colors:              (p.colors || []).join(", "),
    sku:                 p.sku || "",
    image_url:           p.image_url || "",
    shopify_product_url: p.shopify_product_url || "",
    buy_button_embed:    p.buy_button_embed || "",
    inventory_status:    p.inventory_status || "in_stock",
    inventory_count:     p.inventory_count != null ? String(p.inventory_count) : "",
    is_active:           p.is_active,
  };
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "16px 20px",
        flex: "1 1 160px",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: color || "#0f172a", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Image with fallback ───────────────────────────────────────────────────────

function ProductImage({ src, alt }: { src: string | null; alt?: string | null }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div
        style={{
          width: "100%",
          height: 200,
          background: "#f1f5f9",
          border: "2px dashed #cbd5e1",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "0.8rem",
          gap: 6,
        }}
      >
        <span style={{ fontSize: "1.8rem" }}>📷</span>
        <span>Add Image</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "Product"}
      onError={() => setBroken(true)}
      style={{
        width: "100%",
        height: 200,
        objectFit: "cover",
        borderRadius: 10,
        display: "block",
        background: "#f1f5f9",
      }}
    />
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDeleted,
}: {
  product: StoreProduct;
  onEdit: (p: StoreProduct) => void;
  onDeleted: (id: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inv = inventoryBadge(product.inventory_status);

  function handleCopy(text: string | null, key: string) {
    if (!text) return;
    copyToClipboard(text, () => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleDelete() {
    if (!confirm(`Deactivate "${product.title}"? (Soft delete — can be restored via DB)`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ronyx/store/products/${product.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(product.id);
      } else {
        const j = await res.json();
        alert(j.error || "Delete failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: product.is_active ? 1 : 0.6,
        position: "relative",
      }}
    >
      {/* Active/Inactive badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontSize: "0.65rem",
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 20,
          background: product.is_active ? "#dcfce7" : "#fee2e2",
          color: product.is_active ? "#15803d" : "#dc2626",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {product.is_active ? "Active" : "Inactive"}
      </div>

      {/* Image */}
      <ProductImage src={product.image_url} alt={product.image_alt} />

      {/* Title & Category */}
      <div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", lineHeight: 1.3, paddingRight: 60 }}>
          {product.title}
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 5,
            fontSize: "0.68rem",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 20,
            background: "#ede9fe",
            color: "#7c3aed",
          }}
        >
          {product.category}
        </span>
      </div>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e40af" }}>
          {fmtPrice(product.price)}
        </span>
        {product.compare_at_price != null && (
          <span style={{ fontSize: "0.85rem", color: "#94a3b8", textDecoration: "line-through" }}>
            {fmtPrice(product.compare_at_price)}
          </span>
        )}
      </div>

      {/* Sizes */}
      {product.sizes && product.sizes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {product.sizes.map((s) => (
            <span
              key={s}
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 5,
                border: "1px solid #cbd5e1",
                color: "#475569",
                background: "#f8fafc",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Colors */}
      {product.colors && product.colors.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {product.colors.map((c) => (
            <span
              key={c}
              style={{
                fontSize: "0.68rem",
                padding: "2px 7px",
                borderRadius: 5,
                border: "1px solid #cbd5e1",
                color: "#334155",
                background: "#f1f5f9",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Inventory status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 20,
            background: inv.bg,
            color: inv.color,
          }}
        >
          {inv.label}
        </span>
        {product.inventory_count != null && (
          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
            {product.inventory_count} units
          </span>
        )}
      </div>

      {/* SKU */}
      {product.sku && (
        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>SKU: {product.sku}</div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        <button
          onClick={() => onEdit(product)}
          style={actionBtn("#1e40af")}
        >
          ✏ Edit
        </button>

        <button
          onClick={() => handleCopy(product.shopify_product_url, "link")}
          style={actionBtn(copied === "link" ? "#15803d" : "#475569")}
          disabled={!product.shopify_product_url}
          title={product.shopify_product_url ? "Copy product link" : "No Shopify URL set"}
        >
          {copied === "link" ? "✓ Copied!" : "🔗 Copy Link"}
        </button>

        {product.shopify_product_url && (
          <button
            onClick={() => window.open(product.shopify_product_url!, "_blank")}
            style={actionBtn("#7c3aed")}
          >
            🛍 Open Shopify
          </button>
        )}

        {product.buy_button_embed && (
          <button
            onClick={() => handleCopy(product.buy_button_embed, "embed")}
            style={actionBtn(copied === "embed" ? "#15803d" : "#0891b2")}
          >
            {copied === "embed" ? "✓ Copied!" : "📋 Copy Embed"}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          style={actionBtn("#dc2626")}
        >
          {deleting ? "…" : "🗑 Deactivate"}
        </button>
      </div>
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: "5px 11px",
    fontSize: "0.72rem",
    fontWeight: 600,
    borderRadius: 7,
    border: `1px solid ${color}`,
    background: "transparent",
    color,
    cursor: "pointer",
    transition: "background 120ms, color 120ms",
    whiteSpace: "nowrap",
  };
}

// ── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({
  mode,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSaved: (product: StoreProduct, isNew: boolean) => void;
}) {
  const isEdit = mode !== null && mode !== "add";
  const [form, setForm] = useState<FormState>(() =>
    isEdit ? productToForm(mode as StoreProduct) : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSize(s: string) {
    set(
      "sizes",
      form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : [...form.sizes, s]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr("Title is required"); return; }
    setSaving(true);
    setErr(null);

    const payload = {
      title:               form.title.trim(),
      category:            form.category,
      description:         form.description || null,
      price:               form.price !== "" ? Number(form.price) : null,
      compare_at_price:    form.compare_at_price !== "" ? Number(form.compare_at_price) : null,
      sizes:               form.sizes,
      colors:              form.colors.split(",").map((c) => c.trim()).filter(Boolean),
      sku:                 form.sku || null,
      image_url:           form.image_url || null,
      shopify_product_url: form.shopify_product_url || null,
      buy_button_embed:    form.buy_button_embed || null,
      is_active:           form.is_active,
      inventory_status:    form.inventory_status,
      inventory_count:     form.inventory_count !== "" ? Number(form.inventory_count) : null,
    };

    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/ronyx/store/products/${(mode as StoreProduct).id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/ronyx/store/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Save failed"); return; }
      onSaved(j.product, !isEdit);
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: "0.85rem",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
  };

  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 0 };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.65)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          padding: 28,
          boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}
          >
            ×
          </button>
        </div>

        {err && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 16 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Title */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Title *</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. MoveAround Hoodie"
              required
            />
          </div>

          {/* Category */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Product description…"
            />
          </div>

          {/* Price row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Price ($)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="65.00"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Compare-at Price ($)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                value={form.compare_at_price}
                onChange={(e) => set("compare_at_price", e.target.value)}
                placeholder="80.00"
              />
            </div>
          </div>

          {/* Sizes */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Sizes</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ALL_SIZES.map((s) => (
                <label
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "#334155",
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: form.sizes.includes(s) ? "2px solid #1e40af" : "1px solid #cbd5e1",
                    background: form.sizes.includes(s) ? "#dbeafe" : "#f8fafc",
                    fontWeight: form.sizes.includes(s) ? 700 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.sizes.includes(s)}
                    onChange={() => toggleSize(s)}
                    style={{ display: "none" }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Colors (comma-separated)</label>
            <input
              style={inputStyle}
              value={form.colors}
              onChange={(e) => set("colors", e.target.value)}
              placeholder="Black, Navy, White"
            />
          </div>

          {/* SKU */}
          <div style={fieldStyle}>
            <label style={labelStyle}>SKU</label>
            <input
              style={inputStyle}
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="MAT-HOODIE-001"
            />
          </div>

          {/* Image URL */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Image URL</label>
            <input
              style={inputStyle}
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="/merch/product.jpg or https://..."
            />
          </div>

          {/* Shopify Product URL */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Shopify Product URL</label>
            <input
              style={inputStyle}
              value={form.shopify_product_url}
              onChange={(e) => set("shopify_product_url", e.target.value)}
              placeholder="https://yourstore.myshopify.com/products/..."
            />
          </div>

          {/* Buy Button Embed */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Buy Button Embed Code (from Shopify Admin)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, fontSize: "0.72rem", fontFamily: "monospace", resize: "vertical" }}
              value={form.buy_button_embed}
              onChange={(e) => set("buy_button_embed", e.target.value)}
              placeholder="<div id='product-component-...'></div><script>...</script>"
            />
          </div>

          {/* Inventory */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Inventory Status</label>
              <select
                style={inputStyle}
                value={form.inventory_status}
                onChange={(e) => set("inventory_status", e.target.value as InventoryStatus)}
              >
                {INVENTORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Inventory Count</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                value={form.inventory_count}
                onChange={(e) => set("inventory_count", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Active toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Active (visible in store)
          </label>

          {/* Submit */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "11px 0",
                background: saving ? "#94a3b8" : "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "11px 20px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Settings View ─────────────────────────────────────────────────────────────

function SettingsView({
  settings,
  onBack,
  onSaved,
}: {
  settings: StoreSettings;
  onBack: () => void;
  onSaved: (s: StoreSettings) => void;
}) {
  const [form, setForm] = useState({
    store_name:         settings.store_name || "MoveAround Merch Store",
    store_enabled:      settings.store_enabled,
    shopify_store_url:  settings.shopify_store_url || "",
    shopify_embed_code: settings.shopify_embed_code || "",
    embed_mode:         settings.embed_mode || "link",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/ronyx/store/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Save failed"); return; }
      onSaved(j.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: "0.85rem",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 620 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button
          onClick={onBack}
          style={{
            padding: "6px 14px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 7,
            fontWeight: 600,
            fontSize: "0.82rem",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          ← Back to Products
        </button>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
          ⚙ Store Settings
        </h2>
      </div>

      {err && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: "0.82rem" }}>
          {err}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Store Name */}
        <div>
          <label style={labelStyle}>Store Name</label>
          <input
            style={inputStyle}
            value={form.store_name}
            onChange={(e) => set("store_name", e.target.value)}
            placeholder="MoveAround Merch Store"
          />
        </div>

        {/* Store Enabled */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.store_enabled}
            onChange={(e) => set("store_enabled", e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Store Enabled (show in navigation)
        </label>

        {/* Shopify Store URL */}
        <div>
          <label style={labelStyle}>Shopify Store URL</label>
          <input
            style={inputStyle}
            value={form.shopify_store_url}
            onChange={(e) => set("shopify_store_url", e.target.value)}
            placeholder="https://yourstore.myshopify.com"
          />
        </div>

        {/* Shopify Buy Button Embed Code */}
        <div>
          <label style={labelStyle}>Shopify Buy Button Embed Code</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, fontSize: "0.72rem", fontFamily: "monospace", resize: "vertical" }}
            value={form.shopify_embed_code}
            onChange={(e) => set("shopify_embed_code", e.target.value)}
            placeholder="Paste the buy button embed code from Shopify Admin → Sales channels → Buy Button"
          />
        </div>

        {/* Embed Mode */}
        <div>
          <label style={labelStyle}>Embed Mode</label>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            {(["link", "buy_button", "iframe"] as const).map((m) => (
              <label
                key={m}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  color: form.embed_mode === m ? "#1e40af" : "#475569",
                  fontWeight: form.embed_mode === m ? 700 : 400,
                }}
              >
                <input
                  type="radio"
                  name="embed_mode"
                  value={m}
                  checked={form.embed_mode === m}
                  onChange={() => set("embed_mode", m)}
                />
                {m === "link" ? "Link" : m === "buy_button" ? "Buy Button" : "iFrame"}
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        {(form.embed_mode === "link" && form.shopify_store_url) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Preview — Link Mode
            </div>
            <a
              href={form.shopify_store_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1e40af", fontWeight: 600, fontSize: "0.9rem", textDecoration: "underline" }}
            >
              {form.shopify_store_url}
            </a>
          </div>
        )}

        {(form.embed_mode === "buy_button" && form.shopify_embed_code) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Preview — Buy Button Embed
            </div>
            <iframe
              sandbox="allow-scripts allow-same-origin allow-forms"
              title="Shopify Buy Button Preview"
              style={{ width: "100%", height: 200, border: "1px solid #cbd5e1", borderRadius: 8 }}
              srcDoc={`<!DOCTYPE html><html><body style="margin:16px;font-family:sans-serif">${form.shopify_embed_code}</body></html>`}
            />
          </div>
        )}

        {(form.embed_mode === "iframe" && form.shopify_store_url) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Preview — iFrame Mode
            </div>
            <iframe
              title="Shopify Store iFrame"
              src={form.shopify_store_url}
              style={{ width: "100%", height: 360, border: "1px solid #cbd5e1", borderRadius: 8 }}
              allow="payment"
            />
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "11px 0",
            background: saved ? "#15803d" : saving ? "#94a3b8" : "#1e40af",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 200ms",
          }}
        >
          {saved ? "✓ Settings Saved!" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [showSettings, setShowSettings] = useState(false);

  // ── Module lock guard ────────────────────────────────────────────────────────
  const [subLoading, setSubLoading] = useState(true);
  const [activeModules, setActiveModules] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ronyx/subscription")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.activeModules)) setActiveModules(d.activeModules); })
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);
  // ── End module lock guard ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/ronyx/store/products"),
        fetch("/api/ronyx/store/settings"),
      ]);
      const [pJson, sJson] = await Promise.all([pRes.json(), sRes.json()]);
      if (pJson.products) setProducts(pJson.products);
      if (sJson.settings) setSettings(sJson.settings);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleProductSaved(product: StoreProduct, isNew: boolean) {
    setProducts((prev) =>
      isNew
        ? [product, ...prev]
        : prev.map((p) => (p.id === product.id ? product : p))
    );
    setModal(null);
  }

  function handleProductDeleted(id: string) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: false } : p));
  }

  const activeCount = products.filter((p) => p.is_active).length;

  // Module lock: show upgrade card if store module is not active and subscription has loaded
  const storeModuleLocked = !subLoading && !activeModules.includes("store");

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#0f172a" }}>
      {/* ── Header strip ──────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
            🛒 MoveAround Merch Store
          </h1>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", marginTop: 4, fontWeight: 500 }}>
            Company Merch · Staff Gear · Igotta Technologies
          </div>
        </div>
        <span
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#bbf7d0",
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
          }}
        >
          Powered by Shopify
        </span>
      </div>

      {/* ── Module Lock Guard ──────────────────────────────── */}
      {storeModuleLocked && (
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #c4b5fd",
            borderRadius: 16,
            padding: "40px 32px",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto 32px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📦</div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", fontWeight: 900, color: "#0f172a" }}>
            Store / Merch is not active
          </h2>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Activate the Store module to create a Shopify-linked merch store, manage products,
            and sell MoveAround gear directly from your TMS.
          </p>
          <div style={{ margin: "8px 0 20px", fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed" }}>
            $19/mo · Cancel anytime
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/ronyx/settings/modules"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "11px 22px",
                background: "#7c3aed",
                color: "#ffffff",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              🧩 Activate Store Module
            </Link>
            <Link
              href="/ronyx/settings/billing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "11px 22px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: 9,
                fontWeight: 600,
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              Learn More
            </Link>
          </div>
        </div>
      )}

      {/* ── Store body — only shown when module is active ───── */}
      {!storeModuleLocked && (
        <>
          {/* ── KPI Tiles ────────────────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <KpiTile
              label="Active Products"
              value={loading ? "…" : activeCount}
              color="#1e40af"
            />
            <KpiTile
              label="Est. Revenue"
              value="$0"
              sub="Coming soon"
              color="#94a3b8"
            />
            <KpiTile
              label="Orders"
              value="—"
              sub="Sync with Shopify"
              color="#94a3b8"
            />
            <KpiTile
              label="Store Status"
              value={settings?.store_enabled ? "🟢 Active" : "🔴 Inactive"}
              color={settings?.store_enabled ? "#15803d" : "#dc2626"}
            />
          </div>

          {/* ── Quick Actions ──────────────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => { setShowSettings(false); setModal("add"); }}
              style={quickBtn("#1e40af")}
            >
              ＋ Add Product
            </button>
            <button
              onClick={() => setShowSettings((v) => !v)}
              style={quickBtn(showSettings ? "#475569" : "#7c3aed")}
            >
              ⚙ Store Settings
            </button>
            <button
              onClick={() => {
                if (settings?.shopify_store_url) window.open(settings.shopify_store_url, "_blank");
              }}
              disabled={!settings?.shopify_store_url}
              style={quickBtn(settings?.shopify_store_url ? "#15803d" : "#94a3b8")}
              title={settings?.shopify_store_url ? "Open Shopify store" : "Set Shopify URL in Store Settings first"}
            >
              🛍 Open Shopify
            </button>
          </div>

          {/* ── Settings View or Product Grid ────────────────── */}
          {showSettings && settings ? (
            <SettingsView
              settings={settings}
              onBack={() => setShowSettings(false)}
              onSaved={(s) => setSettings(s)}
            />
          ) : (
            <>
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: "0.9rem" }}>
                  Loading products…
                </div>
              ) : products.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 60,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛒</div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#475569" }}>No products yet</div>
                  <div style={{ fontSize: "0.82rem", marginTop: 6 }}>Click "＋ Add Product" to get started</div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 16,
                  }}
                >
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={(p) => setModal(p)}
                      onDeleted={handleProductDeleted}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Add / Edit Modal ───────────────────────────────── */}
          {modal !== null && (
            <ProductModal
              mode={modal}
              onClose={() => setModal(null)}
              onSaved={handleProductSaved}
            />
          )}
        </>
      )}
    </div>
  );
}

function quickBtn(color: string): React.CSSProperties {
  return {
    padding: "9px 18px",
    background: color,
    color: "#ffffff",
    border: "none",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "opacity 120ms",
    opacity: 1,
    whiteSpace: "nowrap",
  };
}
