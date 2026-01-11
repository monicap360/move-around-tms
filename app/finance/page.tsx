"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FinancePage() {
  const [summary, setSummary] = useState<any>({});
  const [payroll, setPayroll] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [filters, setFilters] = useState({ driver: '', dateRange: '', truck: '', customer: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary();
    loadPayroll();
    loadSettlements();
  }, []);

  async function loadSummary() {
    setLoading(true);
    // Fetch total revenue, payroll, profit, outstanding settlements, etc.
    const { data: revenue } = await supabase.rpc('get_total_revenue');
    const { data: payrollPaid } = await supabase.rpc('get_total_payroll_paid');
    const { data: payrollPending } = await supabase.rpc('get_total_payroll_pending');
    const { data: outstandingSettlements } = await supabase.rpc('get_outstanding_settlements');
    const { data: profit } = await supabase.rpc('get_company_profit');
    setSummary({ revenue, payrollPaid, payrollPending, outstandingSettlements, profit });
    setLoading(false);
  }

  async function loadPayroll() {
    // Fetch driver payroll details
    const { data } = await supabase.from('vw_driver_payroll').select('*');
    setPayroll(data || []);
  }

  async function loadSettlements() {
    // Fetch settlements
    const { data } = await supabase.from('vw_settlements').select('*');
    setSettlements(data || []);
  }

  // Filtering logic (not fully implemented for brevity)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)', padding: 0 }}>
      <h1 style={{ fontSize: 44, fontWeight: 700, margin: '32px 0 16px', color: '#1e293b', textAlign: 'center' }}>Finance Dashboard</h1>
      <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 32 }}>
        {/* Overview Dashboard */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
          <SummaryCard label="Total Revenue" value={summary.revenue} color="#059669" />
          <SummaryCard label="Payroll Paid" value={summary.payrollPaid} color="#2563eb" />
          <SummaryCard label="Payroll Pending" value={summary.payrollPending} color="#f59e42" />
          <SummaryCard label="Outstanding Settlements" value={summary.outstandingSettlements} color="#dc2626" />
          <SummaryCard label="Company Profit" value={summary.profit} color="#0ea5e9" />
        </div>
        {/* Quick Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <input placeholder="Driver" style={inputStyle} />
          <input placeholder="Date Range" style={inputStyle} />
          <input placeholder="Truck" style={inputStyle} />
          <input placeholder="Customer" style={inputStyle} />
        </div>
        {/* Driver Payroll Table */}
        <h2 style={{ fontSize: 28, fontWeight: 600, margin: '24px 0 12px', color: '#1e293b' }}>Driver Payroll</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
          <thead>
            <tr style={{ background: '#e0e7ef' }}>
              <th>Driver Name</th>
              <th>Driver ID</th>
              <th>Pay Period</th>
              <th>Total Loads/Hours</th>
              <th>Total Earnings</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Pay Date</th>
            </tr>
          </thead>
          <tbody>
            {payroll.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td>{row.driver_name}</td>
                <td>{row.driver_id}</td>
                <td>{row.pay_period}</td>
                <td>{row.total_loads_hours}</td>
                <td>${row.total_earnings?.toFixed(2)}</td>
                <td>${row.gross_pay?.toFixed(2)}</td>
                <td>
                  Fuel: ${row.deduction_fuel?.toFixed(2)}<br />
                  Loans: ${row.deduction_loans?.toFixed(2)}<br />
                  Maint: ${row.deduction_maintenance?.toFixed(2)}<br />
                  Ins: ${row.deduction_insurance?.toFixed(2)}<br />
                  Taxes: ${row.deduction_taxes?.toFixed(2)}<br />
                  Other: ${row.deduction_other?.toFixed(2)}
                </td>
                <td>${row.net_pay?.toFixed(2)}</td>
                <td>{row.payment_method}</td>
                <td>{row.payment_status}</td>
                <td>{row.pay_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Settlements Table */}
        <h2 style={{ fontSize: 28, fontWeight: 600, margin: '24px 0 12px', color: '#1e293b' }}>Settlements</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
          <thead>
            <tr style={{ background: '#e0e7ef' }}>
              <th>Settlement ID</th>
              <th>Week #</th>
              <th>Driver/Owner</th>
              <th>Truck/Trailer</th>
              <th>Load Details</th>
              <th>Miles/Tons/Hours</th>
              <th>Rate</th>
              <th>Subtotal</th>
              <th>Total Settlement</th>
              <th>Fuel Surcharge</th>
              <th>Adjustments</th>
              <th>Notes</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td>{row.settlement_id}</td>
                <td>{row.week_number}</td>
                <td>{row.driver_owner}</td>
                <td>{row.truck_trailer}</td>
                <td>{row.load_details}</td>
                <td>{row.miles_tons_hours}</td>
                <td>${row.rate?.toFixed(2)}</td>
                <td>${row.subtotal?.toFixed(2)}</td>
                <td>${row.total_settlement?.toFixed(2)}</td>
                <td>${row.fuel_surcharge?.toFixed(2)}</td>
                <td>${row.adjustments?.toFixed(2)}</td>
                <td>{row.notes}</td>
                <td><a href={row.settlement_pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>PDF</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: color, color: '#fff', borderRadius: 12, padding: '18px 32px', minWidth: 180, textAlign: 'center', fontWeight: 600, fontSize: 20 }}>
      <div>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{typeof value === 'number' ? `$${value.toLocaleString()}` : value || '-'}</div>
    </div>
  );
}

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 18,
  color: '#334155',
  background: '#f8fafc',
  width: '100%',
  marginBottom: 0,
};
