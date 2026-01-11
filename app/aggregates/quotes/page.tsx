"use client";

import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

type Quote = {
  id: string;
  company: string;
  contact_name?: string;
  contact_email: string;
  billing_type: string;
  rate: number;
  pay_rate?: number;
  material?: string;
  notes?: string;
  total_profit?: number;
  status: string;
  signature_url?: string;
  created_at: string;
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEmailDraft, setShowEmailDraft] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<Quote>>({
    company: "",
    contact_name: "",
    contact_email: "",
    billing_type: "Load",
    rate: 0,
    pay_rate: 0,
    material: "",
    notes: "",
    status: "Draft",
  });

  useEffect(() => {
    fetchQuotes();
    fetchMaterials();
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const res = await fetch("/api/admin/quotes", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
      },
    });
    const json = await res.json();
    if (json.data) setQuotes(json.data);
    setLoading(false);
  }

  async function fetchMaterials() {
    const res = await fetch("/api/admin/material-rates?active=true", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
      },
    });
    const json = await res.json();
    if (json.data) setMaterials(json.data);
  }

  async function handleSave() {
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing, ...formData } : formData;

    const res = await fetch("/api/admin/quotes", {
      method,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchQuotes();
      setShowForm(false);
      setEditing(null);
      resetForm();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this quote?")) return;
    const res = await fetch(`/api/admin/quotes?id=${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
      },
    });
    if (res.ok) await fetchQuotes();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await fetch("/api/admin/quotes", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) await fetchQuotes();
  }

  async function generateEmailDraft(
    quoteId: string,
    templateType: "customer" | "management",
  ) {
    const res = await fetch("/api/admin/quotes/email-draft", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quote_id: quoteId, template_type: templateType }),
    });
    const draft = await res.json();
    setShowEmailDraft(draft);
  }

  async function sendEmail() {
    if (!showEmailDraft) return;
    const res = await fetch("/api/admin/quotes/send-email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: showEmailDraft.to,
        subject: showEmailDraft.subject,
        body_text: showEmailDraft.body_text,
        body_html: showEmailDraft.body_html,
      }),
    });
    const result = await res.json();
    if (result.success) {
      alert("Email sent successfully!");
      setShowEmailDraft(null);
    } else if (result.draft_mode) {
      alert(result.message);
    } else {
      alert("Failed to send email: " + (result.details || result.error));
    }
  }

  function handleEdit(quote: Quote) {
    setEditing(quote.id);
    setFormData(quote);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      company: "",
      contact_name: "",
      contact_email: "",
      billing_type: "Load",
      rate: 0,
      pay_rate: 0,
      material: "",
      notes: "",
      status: "Draft",
    });
  }

  function handleMaterialSelect(materialName: string) {
    const mat = materials.find((m) => m.material_name === materialName);
    if (mat) {
      setFormData({
        ...formData,
        material: mat.material_name,
        billing_type: mat.unit_type,
        rate: mat.default_bill_rate,
        pay_rate: mat.default_pay_rate,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create, manage, and send customer quotes with approval workflow
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            resetForm();
          }}
        >
          + Create Quote
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit" : "Create"} Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Material (Quick Select)
                </label>
                <select
                  value=""
                  onChange={(e) => handleMaterialSelect(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">
                    -- Select material to auto-fill rates --
                  </option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.material_name}>
                      {m.material_name} (${m.default_bill_rate})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={formData.material || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, material: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Limestone, Gravel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Billing Type *
                </label>
                <select
                  value={formData.billing_type || "Load"}
                  onChange={(e) =>
                    setFormData({ ...formData, billing_type: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Load">Load</option>
                  <option value="Yard">Yard</option>
                  <option value="Ton">Ton</option>
                  <option value="Hour">Hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer Rate *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Driver Pay Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pay_rate || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pay_rate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status || "Draft"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Additional details, terms, or special instructions"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>Save Quote</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showEmailDraft && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle>Email Draft Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <strong>To:</strong>{" "}
                {showEmailDraft.to || "(Management review)"}
              </div>
              <div>
                <strong>Subject:</strong> {showEmailDraft.subject}
              </div>
              <div>
                <strong>Body:</strong>
                <div
                  className="border rounded p-4 mt-2 bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: showEmailDraft.body_html }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {showEmailDraft.to && (
                <Button onClick={sendEmail}>Send Email</Button>
              )}
              <Button variant="outline" onClick={() => setShowEmailDraft(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">Loading quotes...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const profit = (quote.rate || 0) - (quote.pay_rate || 0);
                  const marginPct =
                    quote.rate > 0
                      ? ((profit / quote.rate) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={quote.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{quote.company}</div>
                        <div className="text-xs text-gray-500">
                          {quote.contact_name} · {quote.contact_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {quote.material || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        ${quote.rate.toFixed(2)}/{quote.billing_type}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-green-700">
                          ${profit.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({marginPct}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={quote.status}
                          onChange={(e) =>
                            handleStatusChange(quote.id, e.target.value)
                          }
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending Review">Pending Review</option>
                          <option value="Approved">Approved</option>
                          <option value="Sent">Sent</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(quote)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            generateEmailDraft(quote.id, "management")
                          }
                        >
                          📧 Mgmt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            generateEmailDraft(quote.id, "customer")
                          }
                        >
                          📧 Cust
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(quote.id)}
                        >
                          Del
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
