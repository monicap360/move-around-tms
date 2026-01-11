// Supabase integration for MoveAround TMS static ZIP
// Requires your Supabase URL and anon key

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://YOUR-SUPABASE-URL.supabase.co"; // <-- Replace with your Supabase URL
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY"; // <-- Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Save ticket function
export async function saveTicket(ticketData) {
  const { data, error } = await supabase.from("tickets").insert([ticketData]);
  if (error) {
    alert("Error saving ticket: " + error.message);
    return null;
  }
  alert("Ticket saved!");
  return data;
}

// Example usage: Attach to Save Ticket button
const saveBtn = document.getElementById("saveTicketBtn");
saveBtn.addEventListener("click", async () => {
  const ticket = {
    driver_id: document.getElementById("driver_id").value,
    truck_id: document.getElementById("truck_id").value,
    ticket_date: document.getElementById("ticket_date").value,
    unit_type: document.getElementById("unit_type").value,
    quantity: parseFloat(document.getElementById("quantity").value),
    pay_rate: parseFloat(document.getElementById("pay_rate").value),
    bill_rate: parseFloat(document.getElementById("bill_rate").value),
    ocr_data: document.getElementById("ocrJsonDisplay").textContent,
  };
  await saveTicket(ticket);
});

// TODO: Populate driver and truck dropdowns from Supabase
// Example:
// const { data: drivers } = await supabase.from('drivers').select('*');
// ... populate #driver_id options ...
