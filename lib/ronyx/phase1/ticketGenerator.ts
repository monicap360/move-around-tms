import supabaseAdmin from "@/lib/supabaseAdmin";

export function generateTicketId(projectCode: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${projectCode}-${date}`;
}

export function calculateDistanceMiles(
  pickup: { lat: number; lon: number },
  dump: { lat: number; lon: number },
) {
  const R = 3958.8;
  const dLat = ((dump.lat - pickup.lat) * Math.PI) / 180;
  const dLon = ((dump.lon - pickup.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pickup.lat * Math.PI) / 180) *
      Math.cos((dump.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function calculateWaitingMinutes(
  loadTime?: string | null,
  dumpTime?: string | null,
  freeMinutes = 15,
) {
  if (!loadTime || !dumpTime) return 0;
  const load = new Date(loadTime).getTime();
  const dump = new Date(dumpTime).getTime();
  if (!load || !dump || dump <= load) return 0;
  const totalMinutes = (dump - load) / 60000;
  return Math.max(0, Math.ceil(totalMinutes - freeMinutes));
}

export async function getDailyTicketSequence(
  projectCode: string,
  dateStamp: string,
) {
  const prefix = `${projectCode}-${dateStamp}`;
  const { data } = await supabaseAdmin
    .from("aggregate_tickets")
    .select("ticket_id")
    .ilike("ticket_id", `${prefix}-%`);

  const count = (data || []).length + 1;
  return String(count).padStart(3, "0");
}

export async function buildTicketId(projectCode: string) {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sequence = await getDailyTicketSequence(projectCode, dateStamp);
  return `${projectCode}-${dateStamp}-${sequence}`;
}
