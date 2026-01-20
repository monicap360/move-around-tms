"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Download, Send, FileText, DollarSign, Calendar, Filter } from "lucide-react";

const supabase = createClient();

interface Invoice {
  id: string;
  invoice_number: string;
  company: string;
  total: number;
  status: string;
  due_date: string;
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company: "",
    contact_email: "",
    total: "",
    due_date: "",
    notes: "",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      if (demoMode) {
        setInvoices([
          {
            id: "demo-inv-1",
            invoice_number: "INV-1001",
            company: "Acme Aggregates",
            total: 12500,
            status: "Sent",
            due_date: "2025-01-20",
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (orgMember?.organization_id) {
        setOrganizationId(orgMember.organization_id);
        const response = await fetch(
          `/api/invoices?organization_id=${orgMember.organization_id}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load invoices");
        }
        setInvoices(data.invoices || []);
      }
    } catch (error: any) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    if (demoMode) {
      alert("Invoice creation is disabled in demo mode.");
      return;
    }

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          company: formData.company,
          contact_email: formData.contact_email,
          total: parseFloat(formData.total),
          due_date: formData.due_date || null,
          notes: formData.notes,
          status: 'Draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to create invoice');
      
      setFormData({ company: "", contact_email: "", total: "", due_date: "", notes: "" });
      setShowForm(false);
      await loadInvoices();
      alert('Invoice created successfully!');
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      alert("Error: " + error.message);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    paid: invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    pending: invoices.filter(inv => inv.status === 'Draft' || inv.status === 'Sent').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
      padding: "2rem"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
              Invoices
            </h1>
            <p style={{ fontSize: "1.125rem", color: "#64748b" }}>
              Manage invoices and billing
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus width={20} height={20} />
            Create Invoice
          </Button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <DollarSign style={{ color: "#2563eb", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Total Invoiced</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                ${(stats.total / 1000).toFixed(1)}K
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <FileText style={{ color: "#059669", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Paid</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                ${(stats.paid / 1000).toFixed(1)}K
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardContent style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <Calendar style={{ color: "#f59e42", width: "24px", height: "24px" }} />
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Pending</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
                ${(stats.pending / 1000).toFixed(1)}K
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", marginBottom: "2rem" }}>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b" }}>Create New Invoice</CardTitle>
              <CardDescription style={{ color: "#64748b" }}>Fill in the details to create a new invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvoice} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                <div>
                  <Label htmlFor="company" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Company Name <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="company"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Contact Email <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@example.com"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <Label htmlFor="total" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Amount <span style={{ color: "#dc2626" }}>*</span>
                  </Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    required
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    placeholder="0.00"
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Due Date
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{ borderColor: "#cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label htmlFor="notes" style={{ color: "#1e293b", fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Notes
                  </Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes..."
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontFamily: "inherit" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    style={{ borderColor: "#cbd5e1", color: "#64748b" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Create Invoice
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", marginBottom: "2rem" }}>
          <CardContent style={{ padding: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
              <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: "20px", height: "20px" }} />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "2.5rem", borderColor: "#cbd5e1", borderRadius: "8px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Filter style={{ color: "#64748b", width: "20px", height: "20px" }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: "0.5rem 1rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", color: "#1e293b" }}
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
          <CardHeader>
            <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b" }}>All Invoices</CardTitle>
            <CardDescription style={{ color: "#64748b" }}>{filteredInvoices.length} invoice(s) found</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading...</div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                No invoices found. Click &quot;Create Invoice&quot; to get started.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Invoice #</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Company</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Due Date</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem", color: "#1e293b", fontWeight: 600 }}>{invoice.invoice_number}</td>
                        <td style={{ padding: "0.75rem", color: "#1e293b" }}>{invoice.company}</td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#1e293b", fontWeight: 700 }}>
                          ${Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "9999px",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            background: invoice.status === 'Paid' ? "#d1fae5" : invoice.status === 'Sent' ? "#dbeafe" : invoice.status === 'Overdue' ? "#fee2e2" : "#f1f5f9",
                            color: invoice.status === 'Paid' ? "#059669" : invoice.status === 'Sent' ? "#2563eb" : invoice.status === 'Overdue' ? "#dc2626" : "#64748b"
                          }}>
                            {invoice.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", color: "#64748b" }}>
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button variant="outline" size="sm" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
                              <Download width={16} height={16} />
                            </Button>
                            {invoice.status === 'Draft' && (
                              <Button size="sm" style={{ background: "#2563eb", color: "white", border: "none" }}>
                                <Send width={16} height={16} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
