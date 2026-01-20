"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoleBasedAuth } from "../../lib/role-auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface OperatorData {
  id: string;
  name: string;
  owner: string;
  monthlyFee: number;
  trucks: number;
  lastPayment: string;
  status: "active" | "pending" | "overdue";
  email?: string;
  phone?: string;
}

interface FleetStats {
  activeOperators: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  fleetRating: number;
}

export default function RonYXDashboard() {
  const { user, profile, loading, hasPermission } = useRoleBasedAuth();
  const router = useRouter();
  const [fleetStats, setFleetStats] = useState<FleetStats>({
    activeOperators: 8,
    monthlyRevenue: 12450,
    pendingInvoices: 3,
    fleetRating: 4.8,
  });

  const [operators, setOperators] = useState<OperatorData[]>([]);

  const loadRonYXData = useCallback(async () => {
    try {
      // Get partner info to identify which organizations belong to this partner
      const partnerEmail = user?.email;
      if (!partnerEmail) return;

      // Find partner record
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, slug, email")
        .or(`email.eq.${partnerEmail},slug.eq.ronyx`)
        .limit(1)
        .single();

      if (!partnerData) {
        console.error("Partner not found");
        return;
      }

      // Get organizations/companies for this partner
      // Try multiple possible field names for partner association
      const companyQueries = [
        supabase
          .from("organizations")
          .select("*")
          .eq("partner_id", partnerData.id),
        supabase
          .from("organizations")
          .select("*")
          .eq("partner_slug", partnerData["slug"] || "ronyx"),
        supabase
          .from("companies")
          .select("*")
          .eq("partner_id", partnerData.id),
        supabase
          .from("companies")
          .select("*")
          .eq("partner_slug", partnerData["slug"] || "ronyx"),
      ];

      let companyRecords: any[] = [];
      for (const query of companyQueries) {
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          companyRecords = data;
          break;
        }
      }

      // Get truck counts for each organization
      const operatorsWithTrucks = await Promise.all(
        companyRecords.map(async (company: any) => {
          const companyId = company.id || company.organization_id;
          
          // Get truck count
          const { count: truckCount } = await supabase
            .from("trucks")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", companyId);

          // Get last payment date (from invoices or payments table)
          const { data: lastPaymentData } = await supabase
            .from("invoices")
            .select("paid_date, created_at")
            .eq("organization_id", companyId)
            .not("paid_date", "is", null)
            .order("paid_date", { ascending: false })
            .limit(1)
            .single();

          const lastPayment = lastPaymentData?.paid_date
            ? new Date(lastPaymentData.paid_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "No payments";

          // Determine status based on payment date or organization status
          let status: "active" | "pending" | "overdue" = "active";
          if (company.status === "pending" || company.status === "inactive") {
            status = "pending";
          } else if (lastPaymentData?.paid_date) {
            const paymentDate = new Date(lastPaymentData.paid_date);
            const monthsSincePayment = (new Date().getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsSincePayment > 1) {
              status = "overdue";
            }
          }

          // Get monthly fee (from subscription or organization settings)
          const monthlyFee = company.monthly_fee || company.subscription_fee || 0;

          return {
            id: company.id,
            name: company.name || company.company_name || "Unknown",
            owner: company.contact_name || company.owner_name || company.owner || "N/A",
            monthlyFee: monthlyFee,
            trucks: truckCount || 0,
            lastPayment: lastPayment,
            status: status,
            email: company.contact_email || company.email || "",
            phone: company.contact_phone || company.phone || "",
          };
        })
      );

      setOperators(operatorsWithTrucks);

      // Update fleet stats
      const activeOperators = operatorsWithTrucks.filter((op: any) => op.status === "active").length;
      const monthlyRevenue = operatorsWithTrucks.reduce((sum: number, op: any) => sum + (op.monthlyFee || 0), 0);
      const pendingInvoices = operatorsWithTrucks.filter((op: any) => op.status === "overdue").length;
      const totalTrucks = operatorsWithTrucks.reduce((sum: number, op: any) => sum + (op.trucks || 0), 0);
      
      // Calculate fleet rating based on operator status and payment history
      // Base rating: 4.0, adjust based on active operators and overdue status
      let fleetRating = 4.0;
      if (operatorsWithTrucks.length > 0) {
        const activeRatio = activeOperators / operatorsWithTrucks.length;
        const overdueRatio = pendingInvoices / operatorsWithTrucks.length;
        // Higher rating for more active operators, lower for overdue payments
        fleetRating = 4.0 + (activeRatio * 0.8) - (overdueRatio * 0.5);
        // Ensure rating stays between 3.5 and 5.0
        fleetRating = Math.max(3.5, Math.min(5.0, fleetRating));
      } else {
        fleetRating = 0;
      }

      setFleetStats({
        activeOperators,
        monthlyRevenue,
        pendingInvoices,
        fleetRating: Math.round(fleetRating * 10) / 10,
      });
    } catch (error) {
      console.error("Error loading RonYX data:", error);
      // Fallback to empty array if database query fails
      setOperators([]);
    }
  }, [user?.email]);

  useEffect(() => {
    if (
      profile?.role === "partner" ||
      user?.email === "melidazvl@outlook.com"
    ) {
      loadRonYXData();
    }
  }, [profile?.role, user?.email, loadRonYXData]);

  if (loading) {
    return (
      <div
        className="ronyx-dashboard"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #404040",
              borderTop: "4px solid #F7931E",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          ></div>
          <p style={{ color: "#ccc" }}>Loading ROnyx Fleet Portal...</p>
        </div>
      </div>
    );
  }

  // Check if user has access to ROnyx dashboard
  if (!hasPermission("partner") && user?.email !== "melidazvl@outlook.com") {
    return (
      <div
        className="ronyx-dashboard"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#ccc" }}>
          <h1
            style={{ color: "#F7931E", fontSize: "2rem", marginBottom: "1rem" }}
          >
            Access Denied
          </h1>
          <p>ROnyx Fleet Management access required.</p>
          <Link href="/" style={{ color: "#F7931E", textDecoration: "none" }}>
            Return to Main Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ronyx-dashboard"
      style={{
        background: "#1E1E1E",
        color: "#FFFFFF",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ROnyx Branded Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1E1E1E 0%, #2d2d2d 100%)",
          borderBottom: "3px solid #F7931E",
          padding: "1.5rem 2rem",
          boxShadow: "0 4px 12px rgba(247, 147, 30, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* ROnyx Logo & Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "linear-gradient(135deg, #F7931E, #e8851a)",
                borderRadius: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.8rem",
                boxShadow: "0 4px 12px rgba(247, 147, 30, 0.4)",
              }}
            >
              R
            </div>
            <div>
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: 0,
                }}
              >
                ROnyx Fleet Management
              </h1>
              <p style={{ color: "#F7931E", fontWeight: 600, margin: 0 }}>
                Owner-Operator Hub
              </p>
              <p style={{ color: "#999", fontSize: "0.9rem", margin: 0 }}>
                Powered by Move Around TMS™
              </p>
            </div>
          </div>

          {/* User Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  textAlign: "right",
                  color: "#FFFFFF",
                }}
              >
                Veronica Butanda
              </div>
              <div
                style={{
                  color: "#F7931E",
                  fontSize: "0.9rem",
                  textAlign: "right",
                }}
              >
                Fleet Manager
              </div>
            </div>
            <div
              style={{
                width: "50px",
                height: "50px",
                background: "linear-gradient(135deg, #F7931E, #e8851a)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "1.3rem",
              }}
            >
              V
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "#FFFFFF",
              marginBottom: "0.5rem",
            }}
          >
            Welcome back, Veronica! 👑
          </h2>
          <p style={{ color: "#ccc", fontSize: "1.1rem" }}>
            Manage your owner-operators and track fleet performance
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link
              href="/veronica"
              style={{
                color: "#F7931E",
                textDecoration: "none",
                padding: "0.5rem 1rem",
                border: "1px solid #F7931E",
                borderRadius: "6px",
                fontSize: "0.9rem",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F7931E";
                e.currentTarget.style.color = "#1E1E1E";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#F7931E";
              }}
            >
              📊 ROnyx Manager Dashboard →
            </Link>
          </div>
        </div>

        {/* Fleet Stats Overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <RonYXStatCard
            icon="🚛"
            label="Active Operators"
            value={fleetStats.activeOperators}
          />
          <RonYXStatCard
            icon="💰"
            label="Monthly Revenue"
            value={`$${fleetStats.monthlyRevenue.toLocaleString()}`}
          />
          <RonYXStatCard
            icon="📋"
            label="Pending Invoices"
            value={fleetStats.pendingInvoices}
          />
          <RonYXStatCard
            icon="⭐"
            label="Fleet Rating"
            value={fleetStats.fleetRating}
          />
        </div>

        {/* Owner-Operators Management */}
        <h3
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#FFFFFF",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "2rem",
              background: "#F7931E",
              borderRadius: "2px",
            }}
          ></div>
          Owner-Operators
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {operators.map((operator) => (
            <RonYXOperatorCard 
              key={operator.id} 
              operator={operator}
              onViewDetails={(id) => router.push(`/partners/ronyx/operators/${id}`)}
              onInvoice={(id) => router.push(`/partners/ronyx/operators/${id}/invoice`)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <h3
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#FFFFFF",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "2rem",
              background: "#F7931E",
              borderRadius: "2px",
            }}
          ></div>
          Quick Actions
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <RonYXActionCard
            icon="➕"
            title="Add New Operator"
            description="Onboard a new owner-operator to your fleet"
            action="Add Operator"
            onClick={() => router.push("/partners/ronyx/operators/new")}
          />
          <RonYXActionCard
            icon="📊"
            title="Monthly Reports"
            description="Generate and view financial reports"
            action="View Reports"
            onClick={() => router.push("/partners/ronyx/reports")}
          />
          <RonYXActionCard
            icon="💳"
            title="Payment Management"
            description="Track payments and send invoices"
            action="Manage Payments"
            onClick={() => router.push("/partners/ronyx/payments")}
          />
          <RonYXActionCard
            icon="⚙️"
            title="Fleet Settings"
            description="Configure your brand and preferences"
            action="Settings"
            onClick={() => router.push("/partners/ronyx/settings")}
          />
        </div>
      </main>
    </div>
  );
}

function RonYXStatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#2A2A2A",
        border: "1px solid #404040",
        borderRadius: "12px",
        padding: "1.5rem",
        transition: "all 0.3s ease",
        borderLeft: "4px solid #F7931E",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(247, 147, 30, 0.3)";
        e.currentTarget.style.borderColor = "#F7931E";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#404040";
      }}
    >
      <div style={{ fontSize: "3rem", float: "right", opacity: 0.7 }}>
        {icon}
      </div>
      <div style={{ color: "#ccc", fontWeight: 600, opacity: 0.9 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          color: "#F7931E",
          margin: "0.5rem 0",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RonYXOperatorCard({ operator, onViewDetails, onInvoice }: { operator: OperatorData; onViewDetails?: (id: string) => void; onInvoice?: (id: string) => void }) {
  const router = useRouter();
  const getStatusStyle = (status: string) => {
    const baseStyle = {
      padding: "0.25rem 0.75rem",
      borderRadius: "20px",
      fontSize: "0.8rem",
      fontWeight: 600 as const,
    };

    switch (status) {
      case "active":
        return {
          ...baseStyle,
          background: "rgba(34, 197, 94, 0.2)",
          color: "#22c55e",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        };
      case "pending":
        return {
          ...baseStyle,
          background: "rgba(247, 147, 30, 0.2)",
          color: "#F7931E",
          border: "1px solid rgba(247, 147, 30, 0.3)",
        };
      case "overdue":
        return {
          ...baseStyle,
          background: "rgba(239, 68, 68, 0.2)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      style={{
        background: "#2A2A2A",
        border: "1px solid #404040",
        borderRadius: "12px",
        padding: "1.5rem",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(247, 147, 30, 0.2)";
        e.currentTarget.style.borderColor = "#F7931E";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#404040";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF" }}>
          {operator.name}
        </div>
        <div style={getStatusStyle(operator.status)}>
          {operator.status === "overdue"
            ? "Payment Due"
            : operator.status.charAt(0).toUpperCase() +
              operator.status.slice(1)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
          <div>Owner:</div>
          <div style={{ color: "#FFFFFF", fontWeight: 600 }}>
            {operator.owner}
          </div>
        </div>
        <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
          <div>Monthly Fee:</div>
          <div style={{ color: "#FFFFFF", fontWeight: 600 }}>
            ${operator.monthlyFee}
          </div>
        </div>
        <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
          <div>Trucks:</div>
          <div style={{ color: "#FFFFFF", fontWeight: 600 }}>
            {operator.trucks}
          </div>
        </div>
        <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
          <div>Last Payment:</div>
          <div style={{ color: "#FFFFFF", fontWeight: 600 }}>
            {operator.lastPayment}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => onViewDetails?.(operator.id) || router.push(`/partners/ronyx/operators/${operator.id}`)}
          style={{
            flex: 1,
            background: "#F7931E",
            color: "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#E8851A";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(247, 147, 30, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#F7931E";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {operator.status === "overdue" ? "Follow Up" : "View Details"}
        </button>

        <button
          onClick={() => onInvoice?.(operator.id) || router.push(`/partners/ronyx/operators/${operator.id}/invoice`)}
          style={{
            background: "#404040",
            color: "#FFFFFF",
            border: "1px solid #404040",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#555";
            e.currentTarget.style.borderColor = "#555";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#404040";
            e.currentTarget.style.borderColor = "#404040";
          }}
        >
          {operator.status === "overdue" ? "Send Invoice" : "Invoice"}
        </button>
      </div>
    </div>
  );
}

function RonYXActionCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
}) {
  const router = useRouter();
  return (
    <div
      style={{
        background: "#2A2A2A",
        border: "1px solid #404040",
        borderRadius: "12px",
        padding: "1.5rem",
        transition: "all 0.3s ease",
        textAlign: "center" as const,
        borderTop: "4px solid #F7931E",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(247, 147, 30, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{icon}</div>
      <div
        style={{
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "#FFFFFF",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#ccc",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        {description}
      </div>
      <button
        onClick={onClick || (() => {})}
        style={{
          width: "100%",
          background: "#F7931E",
          color: "white",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#E8851A";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(247, 147, 30, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#F7931E";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {action}
      </button>
    </div>
  );
}
