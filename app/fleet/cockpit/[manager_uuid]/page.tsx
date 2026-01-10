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
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default function FleetCockpitPage(params: { manager_uuid: string }) {
  const [manager, setManager] = useState<any>(null);
  const [layout, setLayout] = useState<any[]>([]);
  const [party, setParty] = useState(false);
  const [highlight, setHighlight] = useState("");
  const confettiRef = useRef(null);

  useEffect(() => {
    loadManager();
    // eslint-disable-next-line
  }, []);

  async function loadManager() {
    const { data } = await supabase
      .from("fleet_managers")
      .select("*")
      .eq("manager_uuid", params.manager_uuid)
      .single();
    setManager(data);
  }

  // default layout positions
  const defaultLayout = [
    { i: "map", x: 0, y: 0, w: 6, h: 4 },
    { i: "comms", x: 6, y: 0, w: 3, h: 2 },
    { i: "maintenance", x: 6, y: 2, w: 3, h: 2 },
    { i: "kpis", x: 0, y: 4, w: 3, h: 2 },
    { i: "dispatch", x: 3, y: 4, w: 3, h: 2 },
    { i: "alerts", x: 6, y: 4, w: 3, h: 2 }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 relative">
      {party && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} ref={confettiRef} />}
      <h1 className="text-3xl font-bold mb-4">
        Fleet Manager Cockpit — {manager?.full_name}
      </h1>
      <button
        className="mb-4 px-4 py-2 bg-pink-600 rounded-lg font-bold shadow hover:bg-pink-500 transition"
        onClick={() => {
          setParty(true);
          setTimeout(() => setParty(false), 2500);
        }}
      >
        🎉 Party Mode
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
        onDragStart={(_, item) => setHighlight(item.i)}
        onDragStop={() => setHighlight("")}
      >
        <motion.div
          key="map"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "map" ? "bg-blue-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetLiveMap manager={manager} />
        </motion.div>
        <motion.div
          key="comms"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "comms" ? "bg-pink-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetComms manager={manager} />
        </motion.div>
        <motion.div
          key="maintenance"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "maintenance" ? "bg-yellow-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetMaintenance manager={manager} />
        </motion.div>
        <motion.div
          key="kpis"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "kpis" ? "bg-green-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: -1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetKPIs manager={manager} />
        </motion.div>
        <motion.div
          key="dispatch"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "dispatch" ? "bg-purple-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: 3 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetDispatchBoard manager={manager} />
        </motion.div>
        <motion.div
          key="alerts"
          className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${highlight === "alerts" ? "bg-red-700" : "bg-gray-900"}`}
          layout
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 1.05, rotate: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="drag-handle cursor-move mb-2 text-xs text-gray-400">⇅ Move</div>
          <FleetAlerts manager={manager} />
        </motion.div>
      </ResponsiveGridLayout>
    </div>
  );
}
