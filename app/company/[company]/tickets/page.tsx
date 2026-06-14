"use client";

import React from "react";
import Link from "next/link";

export default function TicketsPage() {
  const kpis = [
    ["Total Tickets", 0],
    ["Verified Tickets", 0],
    ["Needs Review", 0],
    ["Payroll Holds", 0],
    ["Billing Holds", 0],
    ["Missing Proof", 0],
    ["Duplicate Tickets", 0],
    ["Weight Variances", 0],
  ];

  return (
    <div style={{padding:24, backgroundColor:'#121417', color:'#EDEDED'}}>
      <div style={{marginBottom:12}}>
        <h1 style={{fontSize:28, fontWeight:700}}>Tickets</h1>
        <div style={{color:'#B0B6BD'}}>Manage all dump truck tickets from scan to verification, payroll, and billing.</div>
      </div>

      {/* Top action bar */}
      <div style={{display:'flex', gap:10, margin:'12px 0', flexWrap:'wrap'}}>
        <button style={{backgroundColor:'#F5A623', color:'#121417', padding:'8px 12px', fontWeight:700}}>New Ticket</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Upload Ticket</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Import Tickets</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Run CrossCheck</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Run Ticket Audit</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Export CSV</button>
        <button style={{backgroundColor:'#2A2F36', color:'#EDEDED', padding:'8px 12px'}}>Build Audit Packet</button>
      </div>

      {/* KPI row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8, marginBottom:16}}>
        {kpis.map(([label, value]) => (
          <div key={String(label)} style={{backgroundColor:'#1A1D21', border:'1px solid #343A40', padding:12}}>
            <div style={{fontSize:18, fontWeight:700, color:'#EDEDED'}}>{value}</div>
            <div style={{fontSize:12, color:'#B0B6BD'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Dense table-first layout */}
      <div style={{backgroundColor:'#2A2F36', border:'1px solid #343A40', borderRadius:4, overflow:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{position:'sticky', top:0, backgroundColor:'#1A1D21', zIndex:1}}>
            <tr>
              {[
                'Ticket #','Date','Driver','Truck','Customer','Job','Material','Weight','Source','FastScan','CrossCheck','Ticket Audit','Payroll','Billing','Status','Actions'
              ].map((h) => (
                <th key={h} style={{padding:'10px', textAlign:'left', borderBottom:'1px solid #343A40', color:'#EDEDED', fontSize:13}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* placeholder empty state */}
            <tr>
              <td colSpan={16} style={{padding:20, color:'#B0B6BD'}}>No tickets to display.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
