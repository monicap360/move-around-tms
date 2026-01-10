
"use client";
import React from "react";

export default function AdminBillingPage() {
  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Admin Billing Approval</h1>
      <div className="border rounded p-4 bg-white shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Pending Payments</h2>
        {/* Example: List of pending payments with receipt screenshot and approve/reject buttons */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <img src="/example-receipt.png" alt="Receipt" className="h-16 w-16 rounded mr-4 border" />
            <div>
              <div><span className="font-bold">Company:</span> Example Co</div>
              <div><span className="font-bold">Amount:</span> $3,500 (Setup Fee)</div>
              <div><span className="font-bold">Payment Method:</span> Zelle</div>
            </div>
            <button className="ml-auto bg-green-600 text-white px-3 py-1 rounded font-semibold">Approve</button>
            <button className="ml-2 bg-red-600 text-white px-3 py-1 rounded font-semibold">Reject</button>
          </div>
        </div>
        <p>Review uploaded receipts and approve access for paid customers.</p>
      </div>
    </main>
  );
}
