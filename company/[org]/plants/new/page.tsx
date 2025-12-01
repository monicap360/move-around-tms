"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlant() {
  const [name, setName] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [portCode, setPortCode] = useState("");
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();
    await fetch("../api/create-plant", {
      method: "POST",
      body: JSON.stringify({ name, material_type: materialType, city, state, port_code: portCode }),
    });
    router.push("../plants");
  }

  return (
    <div className="p-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Add Plant / Pit / Aggregate Source</h1>
      <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl flex flex-col gap-4">
        <input
          className="p-2 rounded"
          placeholder="Plant / Pit Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="p-2 rounded"
          placeholder="Material Type (e.g. Aggregate, Sand, Gravel, Cement)"
          value={materialType}
          onChange={e => setMaterialType(e.target.value)}
          required
        />
        <input
          className="p-2 rounded"
          placeholder="City"
          value={city}
          onChange={e => setCity(e.target.value)}
        />
        <input
          className="p-2 rounded"
          placeholder="State"
          value={state}
          onChange={e => setState(e.target.value)}
        />
        <input
          className="p-2 rounded"
          placeholder="Port Code (optional)"
          value={portCode}
          onChange={e => setPortCode(e.target.value)}
        />
        <button type="submit" className="glass-card p-3 rounded-lg bg-cyan-600 text-white font-bold">Add Plant / Pit</button>
      </form>
    </div>
  );
}
