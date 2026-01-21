"use client";

import { Suspense } from "react";
import FleetView from "./FleetView";

export default function FleetPage() {
  return (
    <Suspense fallback={<div />}>
      <FleetView />
    </Suspense>
  );
}
