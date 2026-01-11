"use client";

import * as React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  label?: string;
}

export function Spinner({
  size = "md",
  color = "text-blue-600",
  label,
}: SpinnerProps) {
  const sizeClass =
    size === "sm"
      ? "w-4 h-4 border-2"
      : size === "lg"
        ? "w-10 h-10 border-[5px]"
        : "w-6 h-6 border-2";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`animate-spin rounded-full border-t-transparent border-solid ${sizeClass} ${color}`}
        style={{ borderRightColor: "transparent" }}
      />
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}
