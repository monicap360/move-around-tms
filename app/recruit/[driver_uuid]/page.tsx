"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DriverCard from "../../components/recruiter/DriverCard";
import RankBadge from "../../components/recruiter/RankBadge";
import EndorsementBadge from "../../components/recruiter/EndorsementBadge";
import RecruiterActionBar from "../../components/recruiter/RecruiterActionBar";
import TruckPreview from "../../components/recruiter/TruckPreview";

export default function RecruiterDriverView({ params }) {
  const [driver, setDriver] = useState(null);
  useEffect(() => {
    async function fetchDriver() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("driver_uuid", params.driver_uuid)
        .single();
      setDriver(data);
    }
    fetchDriver();
  }, [params.driver_uuid]);
  if (!driver)
    return <div className="p-8 text-white bg-black min-h-screen">Loading…</div>;
  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1">
          <DriverCard driver={driver} />
          <RankBadge rank={driver.rank} />
          <div className="mt-2 flex flex-wrap gap-1">
            {driver.endorsements?.map((e) => (
              <EndorsementBadge key={e} endorsement={e} />
            ))}
          </div>
          <RecruiterActionBar driver_uuid={driver.driver_uuid} />
        </div>
        <div className="flex-1">
          <TruckPreview
            truck_skin={driver.truck_skin}
            custom_logo_url={driver.custom_logo_url}
          />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-3">Résumé</h2>
        <pre className="bg-gray-900 p-4 rounded-xl text-sm text-white overflow-x-auto">
          {JSON.stringify(driver.resume, null, 2)}
        </pre>
      </div>
    </div>
  );
}
