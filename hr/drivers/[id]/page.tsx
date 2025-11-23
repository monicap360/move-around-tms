export const dynamic = 'force-dynamic';


import React, { useState } from "react";

export default function DriverProfilePage() {
  const [driver, setDriver] = useState({
    id: "sample-1",
    name: "John Doe",
    license: "A1234567",
    status: "Active",
  });
  const [deleted, setDeleted] = useState(false);

  const handleDelete = () => {
    // Simulate delete
    setDeleted(true);
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Driver Profile</h1>
      {!deleted ? (
        <div className="border rounded p-4 mb-4 bg-white shadow">
          <div className="mb-2"><strong>Name:</strong> {driver.name}</div>
          <div className="mb-2"><strong>License:</strong> {driver.license}</div>
          <div className="mb-2"><strong>Status:</strong> {driver.status}</div>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={handleDelete}
          >
            Delete Driver
          </button>
        </div>
      ) : (
        <div className="text-green-600 font-semibold">Driver deleted.</div>
      )}
    </main>
  );
}

