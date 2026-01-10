// Placeholder PageHeader component to unblock build
import React from "react";

export default function PageHeader({ title }: { title: string }) {
  return (
    <div className="mb-6 border-b pb-2">
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}
