"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";

const supabase = createClient();

interface AccountingIntegration {
  id: string;
  organization_id: string;
  provider: 'quickbooks' | 'xero';
  active: boolean;
  connected_at: string | null;
  disconnected_at: string | null;
}

export default function AccountingIntegrationsPage() {
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      setLoading(true);
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get organization_id from user metadata or organizations table
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      if (orgData) {
        setOrganizationId(orgData.id);

        // Fetch integrations
        const { data, error } = await supabase
          .from("accounting_integrations")
          .select("*")
          .eq("organization_id", orgData.id);

        if (error) throw error;
        setIntegrations(data || []);
      }
    } catch (error: any) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(provider: 'quickbooks' | 'xero') {
    try {
      setConnecting(provider);

      // In production, redirect to OAuth flow
      // For now, show instruction
      if (provider === 'quickbooks') {
        window.open('https://appcenter.intuit.com/connect/oauth2', '_blank');
        alert('Redirecting to QuickBooks OAuth. After authorization, you will be redirected back with an authorization code.');
      } else if (provider === 'xero') {
        window.open('https://login.xero.com/identity/connect/authorize', '_blank');
        alert('Redirecting to Xero OAuth. After authorization, you will be redirected back with an authorization code.');
      }

      // Note: In production, implement full OAuth flow with callback handler
      // This would exchange auth_code for access_token via API route
    } catch (error: any) {
      console.error("Error connecting:", error);
      alert("Error connecting: " + error.message);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(provider: 'quickbooks' | 'xero') {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      const response = await fetch('/api/accounting/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          provider,
          action: 'disconnect',
        }),
      });

      if (!response.ok) throw new Error('Failed to disconnect');
      await loadIntegrations();
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      alert("Error disconnecting: " + error.message);
    }
  }

  async function handleSync(provider: 'quickbooks' | 'xero', syncType: string) {
    try {
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          provider,
          sync_type: syncType,
          items: [], // Will be populated from invoices/payments table
        }),
      });

      if (!response.ok) throw new Error('Sync failed');
      const result = await response.json();
      alert(`Sync completed: ${result.items_synced} items synced`);
    } catch (error: any) {
      console.error("Error syncing:", error);
      alert("Error syncing: " + error.message);
    }
  }

  const quickbooksIntegration = integrations.find((i) => i.provider === 'quickbooks');
  const xeroIntegration = integrations.find((i) => i.provider === 'xero');

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
          Accounting Integrations
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#475569", marginBottom: "2rem" }}>
          Connect your accounting software to sync invoices, payments, and financial data automatically.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "1.5rem" }}>
          {/* QuickBooks Card */}
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "0.5rem" }}>
                    QuickBooks Online
                  </CardTitle>
                  <CardDescription style={{ color: "#64748b" }}>
                    Sync invoices, payments, and customers with QuickBooks
                  </CardDescription>
                </div>
                {quickbooksIntegration?.active ? (
                  <CheckCircle2 style={{ color: "#059669", width: "32px", height: "32px" }} />
                ) : (
                  <XCircle style={{ color: "#dc2626", width: "32px", height: "32px" }} />
                )}
              </div>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {quickbooksIntegration?.active ? (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#059669" }}>
                    <CheckCircle2 width={16} height={16} />
                    <span style={{ fontWeight: 600 }}>Connected</span>
                    {quickbooksIntegration.connected_at && (
                      <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                        (Connected {new Date(quickbooksIntegration.connected_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Button
                      onClick={() => handleSync('quickbooks', 'invoices')}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem" }} />
                      Sync Invoices
                    </Button>
                    <Button
                      onClick={() => handleSync('quickbooks', 'payments')}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem" }} />
                      Sync Payments
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleDisconnect('quickbooks')}
                    variant="outline"
                    style={{ borderColor: "#dc2626", color: "#dc2626" }}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <div style={{ color: "#64748b", marginBottom: "1rem" }}>
                    Connect your QuickBooks Online account to automatically sync financial data.
                  </div>
                  <Button
                    onClick={() => handleConnect('quickbooks')}
                    disabled={connecting === 'quickbooks'}
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer", width: "100%" }}
                  >
                    {connecting === 'quickbooks' ? (
                      <>
                        <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem", animation: "spin 1s linear infinite" }} />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink width={16} height={16} style={{ marginRight: "0.5rem" }} />
                        Connect QuickBooks
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Xero Card */}
          <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <CardTitle style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "0.5rem" }}>
                    Xero
                  </CardTitle>
                  <CardDescription style={{ color: "#64748b" }}>
                    Sync invoices, payments, and contacts with Xero
                  </CardDescription>
                </div>
                {xeroIntegration?.active ? (
                  <CheckCircle2 style={{ color: "#059669", width: "32px", height: "32px" }} />
                ) : (
                  <XCircle style={{ color: "#dc2626", width: "32px", height: "32px" }} />
                )}
              </div>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {xeroIntegration?.active ? (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#059669" }}>
                    <CheckCircle2 width={16} height={16} />
                    <span style={{ fontWeight: 600 }}>Connected</span>
                    {xeroIntegration.connected_at && (
                      <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                        (Connected {new Date(xeroIntegration.connected_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Button
                      onClick={() => handleSync('xero', 'invoices')}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem" }} />
                      Sync Invoices
                    </Button>
                    <Button
                      onClick={() => handleSync('xero', 'payments')}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem" }} />
                      Sync Payments
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleDisconnect('xero')}
                    variant="outline"
                    style={{ borderColor: "#dc2626", color: "#dc2626" }}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <div style={{ color: "#64748b", marginBottom: "1rem" }}>
                    Connect your Xero account to automatically sync financial data.
                  </div>
                  <Button
                    onClick={() => handleConnect('xero')}
                    disabled={connecting === 'xero'}
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, cursor: "pointer", width: "100%" }}
                  >
                    {connecting === 'xero' ? (
                      <>
                        <RefreshCw width={16} height={16} style={{ marginRight: "0.5rem", animation: "spin 1s linear infinite" }} />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink width={16} height={16} style={{ marginRight: "0.5rem" }} />
                        Connect Xero
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            Loading integrations...
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
