"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, FileText, CreditCard, BarChart3, ArrowRight } from "lucide-react";

const supabase = createClient();

export default function FinancePage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    totalExpenses: 0,
    profitMargin: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  async function loadFinanceData() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      if (orgData) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total, status")
          .eq("organization_id", orgData.id);

        const totalRevenue = (invoices || []).filter((inv: any) => inv.status === 'Paid').reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);
        const pendingPayments = (invoices || []).filter((inv: any) => inv.status === 'Draft' || inv.status === 'Sent').reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);
        const totalExpenses = 0; // TODO: Calculate from fuel, payroll, etc.
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0;

        setStats({
          totalRevenue,
          pendingPayments,
          totalExpenses,
          profitMargin,
        });
      }
    } catch (error: any) {
      console.error("Error loading finance data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid #e5e7eb",
            borderTop: "4px solid #2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem"
          }}></div>
          <p style={{ color: "#64748b" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
      padding: "2rem"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
            Finance & Accounting
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#64748b" }}>
            Financial overview and accounting management
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <StatCard 
            title="Total Revenue"
            value={`$${(stats.totalRevenue / 1000).toFixed(1)}K`}
            icon={DollarSign}
            color="#059669"
          />
          <StatCard 
            title="Pending Payments"
            value={`$${(stats.pendingPayments / 1000).toFixed(1)}K`}
            icon={CreditCard}
            color="#f59e42"
          />
          <StatCard 
            title="Total Expenses"
            value={`$${(stats.totalExpenses / 1000).toFixed(1)}K`}
            icon={TrendingUp}
            color="#dc2626"
          />
          <StatCard 
            title="Profit Margin"
            value={`${stats.profitMargin.toFixed(1)}%`}
            icon={BarChart3}
            color="#2563eb"
          />
        </div>

        {/* Quick Links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          <Link href="/accounting" style={{ textDecoration: "none" }}>
            <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", cursor: "pointer" }}>
              <CardContent style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <FileText style={{ color: "#2563eb", width: "32px", height: "32px" }} />
                <div style={{ flex: 1 }}>
                  <CardTitle style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "0.25rem" }}>
                    Accounting Dashboard
                  </CardTitle>
                  <CardDescription style={{ color: "#64748b" }}>
                    Manage invoices, bills, and accounting
                  </CardDescription>
                </div>
                <ArrowRight style={{ color: "#94a3b8", width: "20px", height: "20px" }} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/invoices" style={{ textDecoration: "none" }}>
            <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", cursor: "pointer" }}>
              <CardContent style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <FileText style={{ color: "#a21caf", width: "32px", height: "32px" }} />
                <div style={{ flex: 1 }}>
                  <CardTitle style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "0.25rem" }}>
                    Invoices
                  </CardTitle>
                  <CardDescription style={{ color: "#64748b" }}>
                    Create and manage invoices
                  </CardDescription>
                </div>
                <ArrowRight style={{ color: "#94a3b8", width: "20px", height: "20px" }} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/accounting/integrations" style={{ textDecoration: "none" }}>
            <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)", cursor: "pointer" }}>
              <CardContent style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <BarChart3 style={{ color: "#0ea5e9", width: "32px", height: "32px" }} />
                <div style={{ flex: 1 }}>
                  <CardTitle style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "0.25rem" }}>
                    Accounting Integrations
                  </CardTitle>
                  <CardDescription style={{ color: "#64748b" }}>
                    QuickBooks, Xero, and more
                  </CardDescription>
                </div>
                <ArrowRight style={{ color: "#94a3b8", width: "20px", height: "20px" }} />
              </CardContent>
            </Card>
          </Link>
        </div>
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

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card style={{ background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(30,41,59,0.08)" }}>
      <CardContent style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <div style={{ 
            background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
            borderRadius: "12px",
            padding: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Icon style={{ color, width: "24px", height: "24px" }} />
          </div>
          <span style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 500 }}>{title}</span>
        </div>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>{value}</div>
      </CardContent>
    </Card>
  );
}
