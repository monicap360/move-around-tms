"use client";

import { useEffect, useState } from "react";

export default function PlantMaterials({ params }: any) {
  const [materials, setMaterials] = useState<any[]>([]);
  const { organization_code, plant_id } = params;

  useEffect(() => {
    fetch(`/api/company/${organization_code}/plants/${plant_id}/materials`)
      .then((r) => r.json())
      .then((d) => setMaterials(d.items || []));
  }, [organization_code, plant_id]);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Aggregate Materials</h1>
      <div className="glass-card p-6 rounded-xl mb-6">
        <a href="materials/new" className="glass-card p-3 rounded-lg bg-cyan-600 text-white font-bold inline-block">➕ Add Material</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {materials.map((m: any) => (
          <div key={m.id} className="glass-card p-4 rounded-xl">
            <h2 className="text-xl font-semibold">{m.name}</h2>
            <p className="opacity-70">Type: {m.type}</p>
            <p className="opacity-70">Price: ${m.price}</p>
            <p className="opacity-70">Unit: {m.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
