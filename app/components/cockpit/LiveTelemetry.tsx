"use client";
import { useEffect, useState } from "react";

export default function LiveTelemetry({ driver }) {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    // Simulate live telemetry fetch
    const interval = setInterval(() => {
      setTelemetry({
        speed: Math.floor(Math.random() * 80),
        fuel: Math.floor(Math.random() * 100),
        location: "Houston, TX",
        engineTemp: 180 + Math.floor(Math.random() * 20)
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!telemetry) return <div>Loading telemetry...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Live Telemetry</h2>
      <div>Speed: <b>{telemetry.speed} mph</b></div>
      <div>Fuel: <b>{telemetry.fuel}%</b></div>
      <div>Location: <b>{telemetry.location}</b></div>
      <div>Engine Temp: <b>{telemetry.engineTemp}°F</b></div>
    </div>
  );
}
