"use client";

import { useEffect, useState } from "react";

export default function LiveTelemetry({ driver }: any) {
  const [earningsToday, setEarningsToday] = useState(0);
  const [maxEarnings, setMaxEarnings] = useState(400); // adjustable by Admin
  const [hosUsed, setHosUsed] = useState(0);
  const [hosMax, setHosMax] = useState(14); // 14 hr rule
  const [ocrAlerts, setOcrAlerts] = useState<any[]>([]);
  const [inYard, setInYard] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState<any>({
    insideGeofences: [],
    events: [],
    violations: [],
  });

  useEffect(() => {
    // Live earnings (simulated API)
    fetch(`/api/driver/${driver.uuid}/earnings-today`)
      .then((r) => r.json())
      .then((d) => setEarningsToday(d.total || 0));

    // HOS meter load
    fetch(`/api/driver/${driver.uuid}/hos`)
      .then((r) => r.json())
      .then((d) => setHosUsed(d.hours_used || 0));

    // Live OCR stream
    const sse = new EventSource(`/api/driver/${driver.uuid}/ocr-stream`);
    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOcrAlerts((prev) => [data, ...prev]);
    };

    // Yard detection and geofencing (GPS)
    if (navigator.geolocation) {
      let previousLocation: { lat: number; lng: number } | null = null;

      navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const currentLocation = { lat: latitude, lng: longitude };

        // Yard detection
        fetch(
          `/api/yard/detect?lat=${latitude}&lng=${longitude}&driver=${driver.uuid}`,
        )
          .then((r) => r.json())
          .then((d) => setInYard(d.inYard || false));

        // Geofence checking
        if (driver.organization_id) {
          fetch("/api/geofencing/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              driverId: driver.uuid,
              organizationId: driver.organization_id,
              previousLatitude: previousLocation?.lat || null,
              previousLongitude: previousLocation?.lng || null,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              setGeofenceStatus({
                insideGeofences: d.insideGeofences || [],
                events: d.events || [],
                violations: d.violations || [],
              });

              // Show alerts for entry/exit events
              d.events?.forEach((event: any) => {
                if (event.eventType === "entry") {
                  console.log(`Entered geofence: ${event.metadata?.geofenceName}`);
                } else if (event.eventType === "exit") {
                  console.log(`Exited geofence: ${event.metadata?.geofenceName}`);
                }
              });

              // Show alerts for violations
              d.violations?.forEach((violation: any) => {
                console.warn(`Geofence violation: ${violation.message}`);
              });
            })
            .catch((err) => console.error("Geofence check error:", err));
        }

        previousLocation = currentLocation;
      });
    }

    return () => sse.close();
  }, [driver]);

  const earningsPercent = Math.min((earningsToday / maxEarnings) * 100, 100);
  const hosPercent = Math.min((hosUsed / hosMax) * 100, 100);

  return (
    <section className="glass-panel p-5 rounded-2xl flex flex-col gap-6">
      {/* EARNINGS BATTERY */}
      <div>
        <p className="text-sm opacity-70 mb-1">Today’s Earnings</p>
        <div className="w-full h-5 bg-black/20 rounded-lg overflow-hidden">
          <div
            style={{
              width: `${earningsPercent}%`,
              background:
                earningsPercent > 70
                  ? "linear-gradient(90deg,#00d4b3,#00a68c)"
                  : "linear-gradient(90deg,#0077ff,#00d4b3)",
            }}
            className="h-full transition-all duration-700"
          ></div>
        </div>
        <p className="mt-1 text-lg font-semibold">
          ${earningsToday.toFixed(2)} / ${maxEarnings}
        </p>
      </div>

      {/* HOS METER */}
      <div>
        <p className="text-sm opacity-70 mb-1">Hours Of Service Used</p>
        <div className="w-full h-5 bg-black/20 rounded-lg overflow-hidden">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${hosPercent}%`,
              background:
                hosPercent < 80
                  ? "linear-gradient(90deg,#00b4ff,#0077ff)"
                  : "linear-gradient(90deg,#ff3d3d,#ff0000)",
            }}
          ></div>
        </div>
        <p className="mt-1 text-lg font-semibold">
          {hosUsed}h / {hosMax}h
        </p>
      </div>

      {/* YARD STATUS */}
      <div
        className={`rounded-xl p-4 border ${
          inYard ? "border-emerald-400" : "border-cyan-400"
        } glass-card`}
      >
        <p className="font-bold text-lg mb-1">
          {inYard ? "In Yard" : "On The Road"}
        </p>
        <p className="text-sm opacity-70">
          {inYard
            ? "Yard proximity detected via GPS"
            : "No yard signal detected"}
        </p>
      </div>

      {/* GEOFENCE STATUS */}
      {geofenceStatus.insideGeofences.length > 0 && (
        <div className="rounded-xl p-4 border border-blue-400 glass-card">
          <p className="font-bold text-lg mb-2">Geofence Status</p>
          <div className="space-y-1">
            {geofenceStatus.insideGeofences.map((geofence: any, i: number) => (
              <p key={i} className="text-sm opacity-70">
                ✓ Inside: {geofence.name}
              </p>
            ))}
          </div>
          {geofenceStatus.violations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-red-400/30">
              <p className="text-sm font-semibold text-red-400 mb-1">
                Violations:
              </p>
              {geofenceStatus.violations.map((v: any, i: number) => (
                <p key={i} className="text-xs text-red-300">
                  ⚠ {v.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OCR ALERT STREAM */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-lg">OCR & Ticket Alerts</h3>
        {ocrAlerts.length === 0 && (
          <p className="opacity-60 text-sm">No new alerts</p>
        )}

        {ocrAlerts.slice(0, 4).map((a, i) => (
          <div
            key={i}
            className="glass-card p-3 rounded-lg border border-cyan-400/20"
          >
            <p className="text-sm font-semibold">Ticket #{a.ticket_id}</p>
            <p className="text-sm opacity-70">
              {a.message || "OCR update received"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
