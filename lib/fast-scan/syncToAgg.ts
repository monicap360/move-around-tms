// Shared: mirror a fast-scan document into aggregate_tickets ("the agg portion" that
// payroll/billing read), so a scan with driver + truck + loads (+ signature) becomes
// payroll-ready. Used by the scan Edit (PATCH) and the OCR process route.

export const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Insert/update tolerant of schema drift: drops unknown columns AND generated columns
// (total_pay/total_amount are computed by the DB and reject explicit values).
export async function stripAndRetry(
  run: (p: any) => PromiseLike<{ data: any; error: any }>,
  payload: Record<string, any>,
): Promise<{ data?: any; error?: any }> {
  const p: Record<string, any> = { ...payload };
  for (let i = 0; i < 25; i++) {
    const { data, error } = await run(p);
    if (!error) return { data };
    const msg = error?.message || "";
    const m = /Could not find the '(.+?)' column/.exec(msg) || /non-DEFAULT value into column "(.+?)"/.exec(msg);
    if (m && Object.prototype.hasOwnProperty.call(p, m[1])) { delete p[m[1]]; continue; }
    return { error };
  }
  return { error: { message: "schema drift" } };
}

export async function syncScanToAgg(sb: any, scan: any): Promise<{ synced: boolean; reason?: string }> {
  const orgId = scan.organization_id;
  const ticketNo = String(scan.ticket_number || "").trim();
  if (!ticketNo) return { synced: false, reason: "no ticket number — add one to make it payroll-ready" };

  const amount = scan.amount != null ? num(scan.amount) : (num(scan.quantity) * num(scan.rate) || null);
  const payload: Record<string, any> = {
    organization_id: orgId,
    ticket_number: ticketNo,
    ticket_date: scan.ticket_date || null,
    driver_name: scan.driver_name || null,
    driver_id: scan.driver_id || null,
    truck_number: scan.truck_number || null,
    material: scan.material || null,
    customer_name: scan.customer_name || null,
    quantity: num(scan.quantity) || null,
    pay_rate: num(scan.rate) || null,
    bill_rate: num(scan.rate) || null,
    amount,
    total_pay: amount,        // stripped if generated
    total_amount: amount,     // stripped if generated
    signature_present: !!scan.has_driver_signature,
    has_signature: !!scan.has_driver_signature,
    status: "approved",
    source: "fast_scan",
    scan_source: "fast_scan",
    updated_at: new Date().toISOString(),
  };

  let existingId: string | null = null;
  if (orgId) {
    const { data } = await sb.from("aggregate_tickets").select("id").eq("ticket_number", ticketNo).eq("organization_id", orgId).maybeSingle();
    existingId = data?.id || null;
  }
  const { error } = existingId
    ? await stripAndRetry((p) => sb.from("aggregate_tickets").update(p).eq("id", existingId).select("id").single(), payload)
    : await stripAndRetry((p) => sb.from("aggregate_tickets").insert(p).select("id").single(), payload);
  return { synced: !error, reason: error?.message };
}
