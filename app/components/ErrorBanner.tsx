import React from "react";

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-300 text-red-700 rounded p-3 mb-4">
      ⚠️ {message}
    </div>
  );
}
