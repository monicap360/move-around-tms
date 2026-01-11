# Supabase usage and examples

This file shows a minimal recommended setup and two example components (Dashboard and Payroll) that import the client from `lib/supabaseClient.ts`.

1. Create the client (done): `lib/supabaseClient.ts`

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

2. Environment (copy and update): `.env.local.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Copy `.env.local.example` to `.env.local` and replace with your real values. Restart your dev server after editing env vars.

3. Example: Dashboard card component (client-side)

Place this in a client route or component; it will query public tables using the ANON key.

```tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      const { data: fleet } = await supabase
        .from("trucks")
        .select("id")
        .eq("status", "Ready");
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id")
        .eq("active", true);
      const { data: loads } = await supabase
        .from("loads")
        .select("id")
        .eq("status", "In Progress");
      setSummary({
        fleet: fleet?.length || 0,
        drivers: drivers?.length || 0,
        loads: loads?.length || 0,
      });
    }
    loadData();
  }, []);

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 text-gray-700">
          <p>Total Trucks: {summary.fleet}</p>
          <p>Active Drivers: {summary.drivers}</p>
          <p>Loads in Progress: {summary.loads}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

4. Example: Payroll page (client-side)

```tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPayroll() {
      const { data } = await supabase
        .from("driver_payroll_summary")
        .select("*");
      setPayroll(data || []);
    }
    fetchPayroll();
  }, []);

  return (
    <div className="p-8">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Weekly Payroll Summary</CardTitle>
        </CardHeader>
        <CardContent className="mt-4 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Driver</th>
                <th className="border px-3 py-2">Hours</th>
                <th className="border px-3 py-2">Rate</th>
                <th className="border px-3 py-2">Gross Pay</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((row) => (
                <tr key={row.driver_id} className="text-center">
                  <td className="border px-3 py-2">{row.name}</td>
                  <td className="border px-3 py-2">
                    {row.total_hours?.toFixed(2)}
                  </td>
                  <td className="border px-3 py-2">${row.pay_rate}</td>
                  <td className="border px-3 py-2 text-green-700 font-semibold">
                    ${row.gross_pay?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

Notes:

- These example components assume tables `trucks`, `drivers`, `loads`, and `driver_payroll_summary` exist in your Supabase DB.
- If you prefer server-side fetching (better for private data), move queries to server components or API routes and use a service role key safely on the server.
