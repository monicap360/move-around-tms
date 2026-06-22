import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Universal search — queries drivers, trucks, OOs, tickets, invoices by name,
// number, MC/DOT, phone, or customer name. Returns up to 12 results total.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;

  const safe = async <T>(p: Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
    try { const r = await p; return r.data || []; } catch { return []; }
  };

  const [drivers, trucks, oos, tickets, invoices, customers] = await Promise.all([
    // Drivers — name, CDL, phone
    safe(supabaseAdmin.from("driver_profiles").select("id,name,status,phone").or(`name.ilike.${like},cdl_number.ilike.${like},phone.ilike.${like}`).limit(4) as any),
    // Trucks — truck number, VIN
    safe(supabaseAdmin.from("ronyx_trucks").select("id,truck_number,make,model,status").or(`truck_number.ilike.${like},vin.ilike.${like}`).limit(3) as any),
    // Owner operators — company name, MC, DOT, EIN, phone
    safe(supabaseAdmin.from("ronyx_owner_operators").select("id,company_name,mc_number,dot_number,contact_phone,status").or(`company_name.ilike.${like},mc_number.ilike.${like},dot_number.ilike.${like},ein.ilike.${like},contact_phone.ilike.${like}`).limit(4) as any),
    // Tickets — ticket number
    safe(supabaseAdmin.from("aggregate_tickets").select("ticket_number,driver_name,ticket_date,status").ilike("ticket_number", like).limit(3) as any),
    // Customer invoices — invoice number
    safe(supabaseAdmin.from("ronyx_invoices").select("id,invoice_number,customer_name,status").or(`invoice_number.ilike.${like},customer_name.ilike.${like}`).limit(3) as any),
    // Customers — company name, phone
    safe(supabaseAdmin.from("ronyx_customers").select("id,company_name,contact_phone").or(`company_name.ilike.${like},contact_phone.ilike.${like}`).limit(3) as any),
  ]);

  const results: { label: string; href: string; type: string }[] = [];

  for (const d of drivers as any[]) {
    results.push({ type: "Driver", label: `${d.name}${d.phone ? ` · ${d.phone}` : ""}${d.status ? ` · ${d.status}` : ""}`, href: `/ronyx/drivers?tab=list&highlight=${d.id}` });
  }
  for (const t of trucks as any[]) {
    results.push({ type: "Truck", label: `#${t.truck_number}${t.make ? ` ${t.make}` : ""}${t.model ? ` ${t.model}` : ""} · ${t.status ?? ""}`, href: `/ronyx/fleet?highlight=${t.id}` });
  }
  for (const o of oos as any[]) {
    results.push({ type: "Owner Op", label: `${o.company_name}${o.mc_number ? ` · MC ${o.mc_number}` : ""}${o.dot_number ? ` · DOT ${o.dot_number}` : ""}`, href: `/ronyx/owner-operators` });
  }
  for (const tk of tickets as any[]) {
    results.push({ type: "Ticket", label: `${tk.ticket_number}${tk.driver_name ? ` · ${tk.driver_name}` : ""} · ${tk.ticket_date ?? ""} · ${tk.status ?? ""}`, href: `/ronyx/tickets?tab=all&search=${tk.ticket_number}` });
  }
  for (const inv of invoices as any[]) {
    results.push({ type: "Invoice", label: `${inv.invoice_number}${inv.customer_name ? ` · ${inv.customer_name}` : ""} · ${inv.status ?? ""}`, href: `/ronyx/billing` });
  }
  for (const c of customers as any[]) {
    results.push({ type: "Customer", label: `${c.company_name}${c.contact_phone ? ` · ${c.contact_phone}` : ""}`, href: `/ronyx/billing?search=${encodeURIComponent(c.company_name)}` });
  }

  return NextResponse.json({ results: results.slice(0, 12) });
}
