"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default function TicketPayrollView({ driver }) {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("driver_id", driver.id);

    setTickets(data);
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Tickets + Payroll</h2>

      <div className="mt-3 space-y-3">
        {tickets?.map((t) => (
          <div
            key={t.id}
            className="p-3 bg-gray-800 rounded-lg border border-gray-700"
          >
            <p>Plant: {t.plant_id}</p>
            <p>Material: {t.material_id}</p>
            <p>
              Weight: <b>{t.weight_out - t.weight_in} lbs</b>
            </p>
            <p>Rate: ${t.rate}</p>
            <p>
              Pay: {" "}
              <b>
                ${(t.weight_out - t.weight_in) * (t.rate / 2000)}
              </b>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
