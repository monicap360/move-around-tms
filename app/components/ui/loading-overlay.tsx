"use client";

import * as React from "react";
import { Spinner } from "./spinner";

interface LoadingOverlayProps {
  show: boolean;
  label?: string;
}

export function LoadingOverlay({ show, label }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <Spinner size="lg" color="text-white" label={label || "Loading..."} />
    </div>
  );
}
