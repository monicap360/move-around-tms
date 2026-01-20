"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function FastScanPage({ params }) {
  const [code, setCode] = useState("");
  const [driver, setDriver] = useState(null);
  const organizationCode = params.organization_code;

  async function lookupDriver() {
    const res = await fetch(`/api/fastscan/${organizationCode}/lookup`, {
      method: "POST",
      body: JSON.stringify({ driver_uuid: code }),
    });
    const data = await res.json();
    setDriver(data.driver || null);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-6 text-cyan-400">
        FastScan • MoveAround TMS
      </h1>
      {/* SCAN INPUT */}
      <motion.div
        className="w-full max-w-lg p-6 rounded-2xl bg-gray-900 bg-opacity-70 border border-gray-700 shadow-xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="text-sm uppercase opacity-60">
          Scan Driver QR / Enter UUID
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 w-full p-3 rounded-xl bg-black border border-cyan-600 focus:outline-none"
          placeholder="Driver UUID"
        />
        <button
          onClick={lookupDriver}
          className="mt-4 w-full p-3 bg-cyan-600 rounded-xl text-black font-bold hover:bg-cyan-400 transition"
        >
          Scan
        </button>
      </motion.div>
      {/* DRIVER CARD */}
      {driver && (
        <motion.div
          className="mt-8 w-full max-w-lg p-6 bg-gray-900 bg-opacity-70 rounded-2xl border border-gray-700 shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-semibold mb-2">{driver.full_name}</h2>
          <p className="text-cyan-400 uppercase">{driver.rank}</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-black rounded-xl">
              <p className="opacity-60 text-sm">Safety Score</p>
              <h3 className="text-3xl">{driver.safety_score}</h3>
            </div>
            <div className="p-4 bg-black rounded-xl">
              <p className="opacity-60 text-sm">Total Loads</p>
              <h3 className="text-3xl">{driver.total_loads}</h3>
            </div>
          </div>
          {/* Action */}
          <button
            className="mt-6 w-full p-3 bg-cyan-600 text-black rounded-xl font-bold"
            onClick={() =>
              (window.location.href = `/fastscan/${organizationCode}/ticket/${driver.driver_uuid}`)
            }
          >
            Create Fast Ticket
          </button>
        </motion.div>
      )}
    </div>
  );
}
