"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import GridLayout from "react-grid-layout";
import LiveTelemetry from "@/components/cockpit/LiveTelemetry";
import DispatchMessenger from "@/components/cockpit/DispatchMessenger";
import MaintenanceAlerts from "@/components/cockpit/MaintenanceAlerts";
import DriverAI from "@/components/cockpit/DriverAI";
import TruckBranding from "@/components/cockpit/TruckBranding";
import TicketPayrollView from "@/components/cockpit/TicketPayrollView";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default function DriverCockpit({ params }) {
  const [driver, setDriver] = useState(null);
  const [layout, setLayout] = useState([]);

  useEffect(() => {
    loadDriver();
  }, []);

  async function loadDriver() {
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("driver_uuid", params.driver_uuid)
      .single();

    setDriver(data);
  }

  // default layout positions
  const defaultLayout = [
    { i: "telemetry", x: 0, y: 0, w: 4, h: 3 },
    { i: "messenger", x: 4, y: 0, w: 4, h: 3 },
    { i: "maintenance", x: 0, y: 4, w: 4, h: 3 },
    { i: "ai", x: 4, y: 4, w: 4, h: 3 },
    { i: "branding", x: 0, y: 8, w: 4, h: 3 },
    { i: "tickets", x: 4, y: 8, w: 4, h: 4 }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-4">
        MoveAround Driver Cockpit — {driver?.full_name}
      </h1>

      <GridLayout
        className="layout"
        layout={layout.length ? layout : defaultLayout}
        cols={8}
        rowHeight={60}
        width={1200}
        onLayoutChange={(l) => setLayout(l)}
      >
        <div key="telemetry" className="p-4 bg-gray-900 rounded-xl">
          <LiveTelemetry driver={driver} />
        </div>

        <div key="messenger" className="p-4 bg-gray-900 rounded-xl">
          <DispatchMessenger driver={driver} />
        </div>

        <div key="maintenance" className="p-4 bg-gray-900 rounded-xl">
          <MaintenanceAlerts driver={driver} />
        </div>

        <div key="ai" className="p-4 bg-gray-900 rounded-xl">
          <DriverAI driver={driver} />
        </div>

        <div key="branding" className="p-4 bg-gray-900 rounded-xl">
          <TruckBranding driver={driver} />
        </div>

        <div key="tickets" className="p-4 bg-gray-900 rounded-xl">
          <TicketPayrollView driver={driver} />
        </div>
      </GridLayout>
    </div>
  );
}
