"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { HexColorPicker } from "react-colorful";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default function TruckBranding({ driver }) {
  const [color, setColor] = useState(driver?.truck_color || "#00AEEF");

  async function saveColor() {
    await supabase
      .from("drivers")
      .update({ truck_color: color })
      .eq("id", driver.id);
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Truck Branding</h2>

      <HexColorPicker color={color} onChange={setColor} />

      <button
        onClick={saveColor}
        className="mt-3 px-4 py-2 bg-blue-600 rounded-lg"
      >
        Save Color
      </button>
    </div>
  );
}
