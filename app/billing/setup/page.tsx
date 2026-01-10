import React from "react";

export default function BillingSetupPage() {
  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Setup Fee Payment</h1>
      <div className="border rounded p-4 bg-white shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">How to Pay</h2>
        <ul className="list-disc pl-6 mb-4">
          <li><span className="font-bold">Zelle:</span> <span className="text-blue-700">409-392-9626</span></li>
          <li><span className="font-bold">Wire Transfer:</span> <span className="text-blue-700">Contact support for wire details</span></li>
        </ul>
        <p className="mb-2">After payment, upload your receipt or screenshot below. Your account will be unlocked once payment is verified.</p>
        <input type="file" className="mb-4" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Upload Receipt</button>
      </div>
    </main>
  );
}
