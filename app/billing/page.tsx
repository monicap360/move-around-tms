"use client";
import React from "react";

export default function BillingPage() {
  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Billing</h1>
      {/* TODO: Upload Zelle screenshot, show subscription status, payment form */}
      <div className="border rounded p-4 bg-white shadow mb-4">
        <p>
          Upload your Zelle screenshot and view your subscription status here.
        </p>
      </div>
      <div className="text-right">
        {/* Only show to admins in production */}
        <a
          href="/billing/admin-zelle"
          className="text-blue-600 underline text-sm"
        >
          Admin: Review Zelle Payments
        </a>
      </div>
    </main>
  );
}
