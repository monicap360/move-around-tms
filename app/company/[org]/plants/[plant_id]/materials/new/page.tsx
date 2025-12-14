"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMaterial({ params }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const { organization_code, plant_id } = params;
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();
    await fetch("../api/create-material", {
      method: "POST",
      body: JSON.stringify({ name, type, price, unit }),
    });
    router.push("../materials");
  }

  return (
    <div className="p-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Add Aggregate Material</h1>
      <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl flex flex-col gap-4">
        <input
          className="p-2 rounded"
          placeholder="Material Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="p-2 rounded"
          placeholder="Type (e.g. Aggregate, Sand, Gravel, Cement)"
          value={type}
          onChange={e => setType(e.target.value)}
          required
        />
        <input
          className="p-2 rounded"
          placeholder="Price"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />
        <input
          className="p-2 rounded"
          placeholder="Unit (e.g. ton, yard, load)"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          required
        />
        <button type="submit" className="glass-card p-3 rounded-lg bg-cyan-600 text-white font-bold">Add Material</button>
      </form>
    </div>
  );
}
