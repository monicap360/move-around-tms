"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import GridLayout from "react-grid-layout";
import { WidthProvider } from "react-grid-layout";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import FleetLiveMap from "@/components/fleet/FleetLiveMap";
import FleetComms from "@/components/fleet/FleetComms";
import FleetMaintenance from "@/components/fleet/FleetMaintenance";
import FleetKPIs from "@/components/fleet/FleetKPIs";
import FleetDispatchBoard from "@/components/fleet/FleetDispatchBoard";
import FleetAlerts from "@/components/fleet/FleetAlerts";

const ResponsiveGridLayout = WidthProvider(GridLayout);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const defaultLayout = [
  { i: "map", x: 0, y: 0, w: 6, h: 4 },
  { i: "comms", x: 6, y: 0, w: 3, h: 2 },
  { i: "maintenance", x: 6, y: 2, w: 3, h: 2 },
  { i: "kpis", x: 0, y: 4, w: 3, h: 2 },
  { i: "dispatch", x: 3, y: 4, w: 3, h: 2 },
  { i: "alerts", x: 6, y: 4, w: 3, h: 2 },
];

export default function FleetCockpit({
  params,
}: {
  params: { manager_uuid: string };
}) {
  const [manager, setManager] = useState<any>(null);
  const [layout, setLayout] = useState<any[]>([]);
  const [party, setParty] = useState(false);
  const [highlight, setHighlight] = useState("");
  const confettiRef = useRef(null);

  useEffect(() => {
    loadManager();
  }, []);

  async function loadManager() {
    const { data } = await supabase
      .from("fleet_managers")
      .select("*")
      .eq("manager_uuid", params.manager_uuid)
      .single();
    setManager(data);
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 relative">
      {party && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 1200}
          height={typeof window !== "undefined" ? window.innerHeight : 800}
          recycle={false}
          numberOfPieces={400}
          ref={confettiRef}
        />
      )}
      <h1 className="text-3xl font-bold mb-4">
        Fleet Manager Cockpit &mdash; {manager?.full_name}
      </h1>
      <button
        className="mb-4 px-4 py-2 bg-pink-600 rounded-lg font-bold shadow hover:bg-pink-500 transition"
        onClick={() => {
          setParty(true);
          setTimeout(() => setParty(false), 2500);
        }}
      >
        Party Mode
      </button>
      <ResponsiveGridLayout
        className="layout"
        layout={layout.length ? layout : defaultLayout}
        cols={9}
        rowHeight={60}
        width={1350}
        onLayoutChange={(l) => setLayout(l)}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        useCSSTransforms={true}
        compactType="vertical"
        onDragStart={(_: any, item: any) => setHighlight(item.i)}
        onDragStop={() => setHighlight("")}
      >
        {[
          { key: "map", color: "blue", Component: FleetLiveMap, rotate: 2 },
          { key: "comms", color: "pink", Component: FleetComms, rotate: -2 },
          { key: "maintenance", color: "yellow", Component: FleetMaintenance, rotate: 1 },
          { key: "kpis", color: "green", Component: FleetKPIs, rotate: -1 },
          { key: "dispatch", color: "purple", Component: FleetDispatchBoard, rotate: 3 },
          { key: "alerts", color: "red", Component: FleetAlerts, rotate: -3 },
        ].map(({ key, color, Component, rotate }) => (
          <motion.div
            key={key}
            className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === key ? `bg-${color}-700` : "bg-gray-900"}`}
            layout
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 1.05, rotate }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">Move</div>
            <Component manager={manager} />
          </motion.div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
