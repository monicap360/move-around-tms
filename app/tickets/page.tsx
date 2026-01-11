
import { useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('../components/tickets/SignaturePad'), { ssr: false });
const QRCodeScan = dynamic(() => import('../components/tickets/QRCodeScan'), { ssr: false });
const GPSCapture = dynamic(() => import('../components/tickets/GPSCapture'), { ssr: false });
import { sendTicketEmail } from '../components/tickets/EmailNotification';
import { generateInvoiceForTicket } from '../components/tickets/AutoInvoice';

  const [activeTab, setActiveTab] = useState("create");
  const [form, setForm] = useState({
    date_time: "",
    driver_name: "",
    truck_number: "",
    trailer_number: "",
    load_type: "",
    customer: "",
    pickup_location: "",
    delivery_location: "",
    material_type: "",
    ticket_status: "Pending",
    gross_weight: "",
    tare_weight: "",
    net_weight: "",
    total_loads: "",
    rate_type: "",
    rate_amount: "",
    calculated_total: "",
    comments: "",
    driver_id: "",
    odometer: "",
    shift_number: "",
    approval: false,
    date_approved: "",
    payment_status: "Unpaid",
    invoice_number: "",
    settlement_ref: "",
  });
  const [uploading, setUploading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const scaleRef = useRef(null);
  const receiptRef = useRef(null);
  const podRef = useRef(null);

  // Fetch tickets on mount
  React.useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (data) setTickets(data);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (["gross_weight", "tare_weight", "rate_amount", "net_weight", "total_loads", "rate_type"].includes(name)) {
      // Auto-calc net_weight and calculated_total
      let gross = parseFloat(name === "gross_weight" ? value : form.gross_weight) || 0;
      let tare = parseFloat(name === "tare_weight" ? value : form.tare_weight) || 0;
      let net = gross - tare;
      let loads = parseFloat(name === "total_loads" ? value : form.total_loads) || 1;
      let rate = parseFloat(name === "rate_amount" ? value : form.rate_amount) || 0;
      let calcTotal = 0;
      if (form.rate_type === "Per Ton" || (name === "rate_type" && value === "Per Ton")) {
        calcTotal = net * rate;
      } else if (form.rate_type === "Per Yard" || (name === "rate_type" && value === "Per Yard")) {
        calcTotal = net * rate;
      } else if (form.rate_type === "Per Load" || (name === "rate_type" && value === "Per Load")) {
        calcTotal = loads * rate;
      } else if (form.rate_type === "Per Hour" || (name === "rate_type" && value === "Per Hour")) {
        calcTotal = loads * rate;
      }
      setForm(f => ({ ...f, net_weight: net.toString(), calculated_total: calcTotal.toFixed(2) }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    // Upload files if present
    let scale_url = null, receipt_url = null, pod_url = null;
    if (scaleRef.current?.files[0]) {
      scale_url = await uploadFile(scaleRef.current.files[0], 'scale');
    }
    if (receiptRef.current?.files[0]) {
      receipt_url = await uploadFile(receiptRef.current.files[0], 'receipt');
    }
    if (podRef.current?.files[0]) {
      pod_url = await uploadFile(podRef.current.files[0], 'pod');
    }
    // Insert ticket
    const ticketPayload = {
      ...form,
      scale_ticket_url: scale_url,
      delivery_receipt_url: receipt_url,
      pod_url,
      approval: form.approval ? 'Approved' : 'Pending',
      created_at: new Date().toISOString(),
      signature,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      qr_data: qrData,
    };
    const { data, error } = await supabase.from('tickets').insert(ticketPayload).select();
    if (data && data[0]) {
      // Auto-generate invoice if approved
      if (ticketPayload.approval === 'Approved') {
        await generateInvoiceForTicket(data[0]);
      }
      // Send email notification
      await sendTicketEmail({
        to: 'office@example.com',
        subject: `Ticket #${data[0].id} Submitted`,
        body: `A new ticket has been submitted by ${data[0].driver_name}. Status: ${data[0].ticket_status}`
      });
    }
    setUploading(false);
    setForm({
      date_time: "",
      driver_name: "",
      truck_number: "",
      trailer_number: "",
      load_type: "",
      customer: "",
      pickup_location: "",
      delivery_location: "",
      material_type: "",
      ticket_status: "Pending",
      gross_weight: "",
      tare_weight: "",
      net_weight: "",
      total_loads: "",
      rate_type: "",
      rate_amount: "",
      calculated_total: "",
      comments: "",
      driver_id: "",
      odometer: "",
      shift_number: "",
      approval: false,
      date_approved: "",
      payment_status: "Unpaid",
      invoice_number: "",
      settlement_ref: "",
    });
    setSignature(null);
    setGps(null);
    setQrData(null);
    if (scaleRef.current) scaleRef.current.value = "";
    if (receiptRef.current) receiptRef.current.value = "";
    if (podRef.current) podRef.current.value = "";
    await fetchTickets();
  }

  async function uploadFile(file, type) {
    const path = `tickets/${type}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('ticket-uploads').upload(path, file);
    if (error) return null;
    return data.path;
  }
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
        padding: 0,
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Tickets</h1>
      <p style={{ fontSize: 20, color: '#475569', marginBottom: 32 }}>
        Upload, manage, and calculate tickets for all loads, jobs, and drivers.
      </p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <button onClick={() => setActiveTab("create")} style={{ fontWeight: 600, color: activeTab === "create" ? '#2563eb' : '#64748b', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>New Ticket</button>
        <button onClick={() => setActiveTab("reports")} style={{ fontWeight: 600, color: activeTab === "reports" ? '#2563eb' : '#64748b', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>Reports</button>
      </div>
      <div style={{ width: '100%', maxWidth: 1000, background: '#e0e7ef', borderRadius: 16, boxShadow: '0 2px 8px rgba(30,41,59,0.08)', padding: 32, marginBottom: 32 }}>
        {activeTab === "create" && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 24 }} onSubmit={handleSubmit}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ticket Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <input placeholder="Ticket Number / ID (auto)" style={inputStyle} disabled />
              <input type="datetime-local" name="date_time" value={form.date_time} onChange={handleChange} placeholder="Date & Time of Load" style={inputStyle} />
              <input name="driver_name" value={form.driver_name} onChange={handleChange} placeholder="Driver Name" style={inputStyle} />
              <input name="truck_number" value={form.truck_number} onChange={handleChange} placeholder="Truck Number" style={inputStyle} />
              <input name="trailer_number" value={form.trailer_number} onChange={handleChange} placeholder="Trailer Number" style={inputStyle} />
              <select name="load_type" value={form.load_type} onChange={handleChange} style={inputStyle} >
                <option value="" disabled>Load Type</option>
                <option>Load</option>
                <option>Yard</option>
                <option>Hour</option>
                <option>Ton</option>
              </select>
              <input name="customer" value={form.customer} onChange={handleChange} placeholder="Customer / Job Name" style={inputStyle} />
              <input name="pickup_location" value={form.pickup_location} onChange={handleChange} placeholder="Pickup Location / Source Yard" style={inputStyle} />
              <input name="delivery_location" value={form.delivery_location} onChange={handleChange} placeholder="Delivery Location / Job Site" style={inputStyle} />
              <input name="material_type" value={form.material_type} onChange={handleChange} placeholder="Material Type (e.g., gravel, sand)" style={inputStyle} />
              <select name="ticket_status" value={form.ticket_status} onChange={handleChange} style={inputStyle} >
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Paid</option>
              </select>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>Weight / Quantity Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <input name="gross_weight" value={form.gross_weight} onChange={handleChange} placeholder="Gross Weight" style={inputStyle} />
              <input name="tare_weight" value={form.tare_weight} onChange={handleChange} placeholder="Tare Weight" style={inputStyle} />
              <input name="net_weight" value={form.net_weight} onChange={handleChange} placeholder="Net Weight (Tons or Yards)" style={inputStyle} />
              <input name="total_loads" value={form.total_loads} onChange={handleChange} placeholder="Total Loads / Hours" style={inputStyle} />
              <select name="rate_type" value={form.rate_type} onChange={handleChange} style={inputStyle} >
                <option value="" disabled>Rate Type</option>
                <option>Per Ton</option>
                <option>Per Yard</option>
                <option>Per Load</option>
                <option>Per Hour</option>
              </select>
              <input name="rate_amount" value={form.rate_amount} onChange={handleChange} placeholder="Rate Amount ($)" style={inputStyle} />
              <input name="calculated_total" value={form.calculated_total} placeholder="Calculated Total ($)" style={inputStyle} disabled />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>Ticket Upload / Attachments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>Upload Scale Ticket <input type="file" ref={scaleRef} style={{ marginLeft: 8 }} /></label>
              <label>Upload Delivery Receipt <input type="file" ref={receiptRef} style={{ marginLeft: 8 }} /></label>
              <label>Upload Signed POD <input type="file" ref={podRef} style={{ marginLeft: 8 }} /></label>
              <QRCodeScan onScan={setQrData} />
              <textarea name="comments" value={form.comments} onChange={handleChange} placeholder="Optional Comments or Notes" style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>GPS & Digital Signature</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <GPSCapture onCapture={setGps} />
              <div style={{ marginTop: 8 }}>
                <SignaturePad onSave={setSignature} />
                {signature && <div style={{ marginTop: 4 }}><img src={signature} alt="Signature preview" style={{ maxWidth: 200, border: '1px solid #cbd5e1', borderRadius: 4 }} /></div>}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>Driver / Truck Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <input name="driver_name" value={form.driver_name} onChange={handleChange} placeholder="Driver Name" style={inputStyle} />
              <input name="driver_id" value={form.driver_id} onChange={handleChange} placeholder="Driver ID" style={inputStyle} />
              <input name="truck_number" value={form.truck_number} onChange={handleChange} placeholder="Truck Number / Unit" style={inputStyle} />
              <input name="trailer_number" value={form.trailer_number} onChange={handleChange} placeholder="Trailer Number" style={inputStyle} />
              <input name="odometer" value={form.odometer} onChange={handleChange} placeholder="Odometer / Mileage (optional)" style={inputStyle} />
              <input name="shift_number" value={form.shift_number} onChange={handleChange} placeholder="Shift or Work Order Number" style={inputStyle} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>Approval & Payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label><input type="checkbox" name="approval" checked={form.approval} onChange={handleChange} style={{ marginRight: 8 }} />Dispatcher / Supervisor Approval</label>
              <input type="date" name="date_approved" value={form.date_approved} onChange={handleChange} placeholder="Date Approved" style={inputStyle} />
              <select name="payment_status" value={form.payment_status} onChange={handleChange} style={inputStyle} >
                <option>Unpaid</option>
                <option>Processing</option>
                <option>Paid</option>
              </select>
              <input name="invoice_number" value={form.invoice_number} onChange={handleChange} placeholder="Invoice Number (if billed)" style={inputStyle} />
              <input name="settlement_ref" value={form.settlement_ref} onChange={handleChange} placeholder="Driver Settlement Reference" style={inputStyle} />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 24, fontSize: 20, fontWeight: 600 }} disabled={uploading}>{uploading ? 'Saving...' : 'Save Ticket'}</button>
          </form>
        )}
        {/* Ticket List */}
        {activeTab === "create" && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Recent Tickets</div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {tickets.map((ticket, idx) => {
                // Discrepancy detection logic
                let discrepancies = [];
                // 1. Duplicates: same driver, date, truck, and material
                for (let j = 0; j < tickets.length; j++) {
                  if (j !== idx && ticket.driver_name && ticket.date_time && ticket.truck_number && ticket.material_type &&
                    ticket.driver_name === tickets[j].driver_name &&
                    ticket.date_time === tickets[j].date_time &&
                    ticket.truck_number === tickets[j].truck_number &&
                    ticket.material_type === tickets[j].material_type) {
                    discrepancies.push('Duplicate ticket');
                    break;
                  }
                }
                // 2. Missing weights
                if (!ticket.gross_weight || !ticket.tare_weight || !ticket.net_weight) {
                  discrepancies.push('Missing weight(s)');
                }
                // 3. Wrong rates: negative or zero rate/total
                if (parseFloat(ticket.rate_amount) <= 0 || parseFloat(ticket.calculated_total) < 0) {
                  discrepancies.push('Invalid rate/total');
                }
                return (
                  <li key={ticket.id} style={{ background: discrepancies.length ? '#fef2f2' : '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(30,41,59,0.06)', marginBottom: 12, padding: 18, border: discrepancies.length ? '2px solid #dc2626' : undefined }}>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>#{ticket.id} - {ticket.driver_name} ({ticket.material_type})</div>
                    <div>Status: {ticket.ticket_status} | Total: ${ticket.calculated_total}</div>
                    <div>Date: {ticket.date_time}</div>
                    <div>Truck: {ticket.truck_number} | Trailer: {ticket.trailer_number}</div>
                    <div>Customer: {ticket.customer}</div>
                    <div>Notes: {ticket.comments}</div>
                    <div>Scale Ticket: {ticket.scale_ticket_url && (<a href={ticket.scale_ticket_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View</a>)}</div>
                    <div>POD: {ticket.pod_url && (<a href={ticket.pod_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View</a>)}</div>
                    {discrepancies.length > 0 && (
                      <div style={{ color: '#dc2626', fontWeight: 700, marginTop: 8 }}>
                        Discrepancy: {discrepancies.join(', ')}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        )}
        {activeTab === "reports" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Reports & Calculations</div>
            {/* Totals by Day/Week/Month */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Totals by Day / Week / Month</div>
              {(() => {
                // Group tickets by day, week, month
                const dayTotals = {};
                const weekTotals = {};
                const monthTotals = {};
                tickets.forEach(ticket => {
                  if (!ticket.date_time) return;
                  const date = new Date(ticket.date_time);
                  const day = date.toISOString().slice(0, 10);
                  const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + 6 - date.getDay()) / 7)}`;
                  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                  const total = parseFloat(ticket.calculated_total) || 0;
                  dayTotals[day] = (dayTotals[day] || 0) + total;
                  weekTotals[week] = (weekTotals[week] || 0) + total;
                  monthTotals[month] = (monthTotals[month] || 0) + total;
                });
                return (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <b>By Day:</b>
                      <ul style={{ marginLeft: 16 }}>
                        {Object.entries(dayTotals).map(([d, t]) => (
                          <li key={d}>{d}: ${t.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <b>By Week:</b>
                      <ul style={{ marginLeft: 16 }}>
                        {Object.entries(weekTotals).map(([w, t]) => (
                          <li key={w}>{w}: ${t.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <b>By Month:</b>
                      <ul style={{ marginLeft: 16 }}>
                        {Object.entries(monthTotals).map(([m, t]) => (
                          <li key={m}>{m}: ${t.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Tons/Yards Hauled by Material or Customer */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Tons / Yards Hauled by Material or Customer</div>
              {(() => {
                const byMaterial = {};
                const byCustomer = {};
                tickets.forEach(ticket => {
                  const net = parseFloat(ticket.net_weight) || 0;
                  if (ticket.material_type) byMaterial[ticket.material_type] = (byMaterial[ticket.material_type] || 0) + net;
                  if (ticket.customer) byCustomer[ticket.customer] = (byCustomer[ticket.customer] || 0) + net;
                });
                return (
                  <div style={{ display: 'flex', gap: 40 }}>
                    <div>
                      <b>By Material:</b>
                      <ul style={{ marginLeft: 16 }}>
                        {Object.entries(byMaterial).map(([mat, amt]) => (
                          <li key={mat}>{mat}: {amt.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <b>By Customer:</b>
                      <ul style={{ marginLeft: 16 }}>
                        {Object.entries(byCustomer).map(([cust, amt]) => (
                          <li key={cust}>{cust}: {amt.toFixed(2)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Driver Earnings Summary */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Driver Earnings Summary</div>
              {(() => {
                const earnings = {};
                tickets.forEach(ticket => {
                  if (!ticket.driver_name) return;
                  const total = parseFloat(ticket.calculated_total) || 0;
                  earnings[ticket.driver_name] = (earnings[ticket.driver_name] || 0) + total;
                });
                return (
                  <ul style={{ marginLeft: 16 }}>
                    {Object.entries(earnings).map(([driver, amt]) => (
                      <li key={driver}>{driver}: ${amt.toFixed(2)}</li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            {/* Revenue by Load Type */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Revenue by Load Type</div>
              {(() => {
                const byType = {};
                tickets.forEach(ticket => {
                  if (!ticket.rate_type) return;
                  const total = parseFloat(ticket.calculated_total) || 0;
                  byType[ticket.rate_type] = (byType[ticket.rate_type] || 0) + total;
                });
                return (
                  <ul style={{ marginLeft: 16 }}>
                    {Object.entries(byType).map(([type, amt]) => (
                      <li key={type}>{type}: ${amt.toFixed(2)}</li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            {/* Ticket Discrepancy Report */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Ticket Discrepancy Report</div>
              <ul style={{ marginLeft: 16 }}>
                {tickets.map((ticket, idx) => {
                  let discrepancies = [];
                  for (let j = 0; j < tickets.length; j++) {
                    if (j !== idx && ticket.driver_name && ticket.date_time && ticket.truck_number && ticket.material_type &&
                      ticket.driver_name === tickets[j].driver_name &&
                      ticket.date_time === tickets[j].date_time &&
                      ticket.truck_number === tickets[j].truck_number &&
                      ticket.material_type === tickets[j].material_type) {
                      discrepancies.push('Duplicate ticket');
                      break;
                    }
                  }
                  if (!ticket.gross_weight || !ticket.tare_weight || !ticket.net_weight) {
                    discrepancies.push('Missing weight(s)');
                  }
                  if (parseFloat(ticket.rate_amount) <= 0 || parseFloat(ticket.calculated_total) < 0) {
                    discrepancies.push('Invalid rate/total');
                  }
                  if (discrepancies.length === 0) return null;
                  return (
                    <li key={ticket.id} style={{ color: '#dc2626' }}>
                      #{ticket.id} - {ticket.driver_name} ({ticket.material_type}): {discrepancies.join(', ')}
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* Optional Features List */}
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 16 }}>Optional Features</div>
            <ul style={{ color: '#2563eb', fontSize: 18, marginLeft: 24 }}>
              <li>Barcode or QR Scan Upload (auto-fill ticket info)</li>
              <li>GPS Timestamp from pickup & drop-off</li>
              <li>Digital Signature Capture</li>
              <li>Auto-Invoice Generation (when approved)</li>
              <li>Email Notifications (to driver or office when tickets are uploaded/approved)</li>
            </ul>
          </div>
        )}
      </div>
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  );
}

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 18,
  color: '#334155',
  background: '#fff',
  width: '100%',
  marginBottom: 0,
};
