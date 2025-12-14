"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import GridLayout from "react-grid-layout";
import LiveTelemetry from "@/components/hud/LiveTelemetry";
import DispatchMessenger from "@/components/hud/DispatchMessenger";
import MaintenanceAlerts from "@/components/hud/MaintenanceAlerts";
import DriverAI from "@/components/hud/DriverAI";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default function DriverHUD({ params }) {
  const [layout, setLayout] = useState([]);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    // fetch driver
    supabase
      .from("drivers")
      .select("*")
      .eq("driver_uuid", params.driver_uuid)
      .single()
      .then(({ data }) => setDriver(data));

    // fetch saved HUD layout
    supabase
      .from("driver_layouts")
      .select("layout_json")
      .eq("driver_uuid", params.driver_uuid)
      .single()
      .then(({ data }) => {
        if (data?.layout_json) setLayout(data.layout_json);
        else {
          // default Tesla layout
          setLayout([
            { i: "telemetry", x: 0, y: 0, w: 6, h: 5 },
            { i: "messenger", x: 6, y: 0, w: 6, h: 5 },
            { i: "alerts", x: 0, y: 5, w: 6, h: 4 },
            { i: "ai", x: 6, y: 5, w: 6, h: 4 },
          ]);
        }
      });
  }, []);

  const saveLayout = async (newLayout) => {
    setLayout(newLayout);

    await supabase
      .from("driver_layouts")
      .upsert({
        driver_uuid: params.driver_uuid,
        layout_json: newLayout,
      });

    console.log("Layout saved.");
  };

  if (!driver) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-4">
        MoveAround Driver HUD — {driver.full_name}
      </h1>

      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1300}
        onLayoutChange={saveLayout}
        draggableHandle=".drag-handle"
      >
        <div key="telemetry" className="bg-gray-900 rounded-xl p-2 drag-handle">
          <LiveTelemetry driver={driver} />
        </div>

        <div key="messenger" className="bg-gray-900 rounded-xl p-2 drag-handle">
          <DispatchMessenger driver={driver} />
        </div>

        <div key="alerts" className="bg-gray-900 rounded-xl p-2 drag-handle">
          <MaintenanceAlerts driver={driver} />
        </div>

        <div key="ai" className="bg-gray-900 rounded-xl p-2 drag-handle">
          <DriverAI driver={driver} />
        </div>
      </GridLayout>
    </div>
  );
}
