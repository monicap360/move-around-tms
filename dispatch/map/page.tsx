"use client";

import MapView from "@/components/dispatch/MapView";

export default function DispatchMapPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Live Map View</h1>
      <MapView />
    </div>
  );
}
