// Supabase integration for invoices
import { createClient } from "@supabase/supabase-js";
import { Invoice } from "./invoice.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchInvoicesForUser(
  user_id: string,
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user_id)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function fetchAllInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function insertInvoice(invoice: Invoice) {
  const { data, error } = await supabase.from("invoices").insert([invoice]);
  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
  return data;
}
