
"use client";
import React from "react";

export default function AdminBillingPage() {
  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Admin Billing Approval</h1>
      {/* TODO: List pending payments, show Zelle screenshot, amount, seat count, add-ons, setup fee, agent, approve/reject buttons */}
      <div className="border rounded p-4 bg-white shadow">
        <p>Review and approve customer billing payments here.</p>
      </div>
    </main>
  );
}
