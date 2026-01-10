"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VeronicaDashboard() {
  const [operators, setOperators] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from("owner_operators").select("*");
      if (error) console.error(error);
      else setOperators(data);
    }
    loadData();
  }, []);

  return (
    <div>
      <h2 className="section-title">Owner-Operators</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>Phone</th>
            <th>Monthly Fee</th>
          </tr>
        </thead>
        <tbody>
          {operators.map((op) => (
            <tr key={op.id}>
              <td>{op.company_name}</td>
              <td>{op.contact_name}</td>
              <td>{op.contact_phone}</td>
              <td>${op.monthly_fee}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
