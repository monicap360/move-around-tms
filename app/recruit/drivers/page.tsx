"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DriverCard from "../../components/recruiter/DriverCard";
import RankBadge from "../../components/recruiter/RankBadge";
import EndorsementBadge from "../../components/recruiter/EndorsementBadge";

export default function DriverMarketplace() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    async function fetchDrivers() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .order("rank");
      setDrivers(data || []);
    }
    fetchDrivers();
  }, []);

  useEffect(() => {
    let d = drivers;
    if (search)
      d = d.filter((driver) =>
        driver.full_name.toLowerCase().includes(search.toLowerCase())
      );
    if (filterRank)
      d = d.filter((driver) => driver.rank === filterRank);
    setFiltered(d);
  }, [drivers, search, filterRank]);

  const ranks = [
    "Operator",
    "Certified Operator",
    "Professional Operator",
    "Fleet Captain",
    "Master Operator",
    "Titan Driver",
  ];

  return (
    <div className="p-8 text-white bg-black min-h-screen">
      <h1 className="text-4xl font-bold mb-6">MoveAround Professional Drivers</h1>
      <div className="flex gap-4 mb-6">
        <input
          className="p-3 rounded bg-gray-900 text-white w-64"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="p-3 rounded bg-gray-900 text-white"
          value={filterRank}
          onChange={(e) => setFilterRank(e.target.value)}
        >
          <option value="">All Ranks</option>
          {ranks.map((rank) => (
            <option key={rank} value={rank}>{rank}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((driver) => (
          <a
            key={driver.driver_uuid}
            href={`/recruit/${driver.driver_uuid}`}
            className="block hover:scale-105 transition-transform"
          >
            <DriverCard driver={driver} />
            <RankBadge rank={driver.rank} />
            <div className="mt-2 flex flex-wrap gap-1">
              {driver.endorsements?.map((e) => (
                <EndorsementBadge key={e} endorsement={e} />
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
