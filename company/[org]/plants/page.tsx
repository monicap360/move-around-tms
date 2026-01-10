"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PlantsHome({ params }: any) {
  const company = params.company;
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    fetch(`/api/company/${company}/plants`)
      .then((r) => r.json())
      .then((d) => setPlants(d.items || []));
  }, [company]);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-cyan-300 mb-6">
        Plant & Pit Partners
      </h1>

      <Link
        href={`/company/${company}/plants/new`}
        className="glass-card p-4 rounded-xl mb-6 inline-block"
      >
        ➕ Add Plant / Pit
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plants.map((p: any) => (
          <Link
            key={p.id}
            href={`/company/${company}/plants/${p.id}`}
            className="glass-card p-6 rounded-2xl"
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="opacity-70">{p.material_type}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
