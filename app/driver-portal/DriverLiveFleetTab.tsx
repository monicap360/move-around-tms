"use client";
import dynamic from "next/dynamic";

// Dynamically import the LiveFleetMap to avoid SSR issues with mapbox
const LiveFleetMap = dynamic(() => import("../dashboard/live-fleet-map"), {
  ssr: false,
});

export default function DriverLiveFleetTab() {
  return (
    <div className="bg-[color:var(--color-surface)] rounded-lg p-2">
      <LiveFleetMap />
    </div>
  );
}
