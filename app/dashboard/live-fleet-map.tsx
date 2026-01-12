"use client";
import { useEffect, useState } from "react";
import { eldProviders } from "../../integrations/eld";
import Map from "react-map-gl/mapbox";
import { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function LiveFleetMap() {
  const [locations, setLocations] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [hos, setHos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const MAPBOX_TOKEN =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja3Z4b2J6b3gwM2JwMnZxczZ6b2J6b2JwIn0.abc123";

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // Fetch from all providers (real)
        const [locs, trucks, hos] = await Promise.all([
          Promise.all(eldProviders.map((p) => p.fetchDriverLocations())).then(
            (r) => r.flat(),
          ),
          Promise.all(eldProviders.map((p) => p.fetchTruckStatus())).then((r) =>
            r.flat(),
          ),
          Promise.all(eldProviders.map((p) => p.fetchHOS())).then((r) =>
            r.flat(),
          ),
        ]);
        setLocations(locs);
        setTrucks(trucks);
        setHos(hos);
      } catch (err) {
        setLocations([]);
        setTrucks([]);
        setHos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-[80vh] p-4 gap-4">
      <div className="flex-1 relative min-h-[400px]">
        <h1 className="text-2xl font-bold mb-2">
          Live Fleet Map (ELD/Telematics)
        </h1>
        {loading ? (
          <div>Loading driver locations…</div>
        ) : locations.length === 0 ? (
          <div className="text-red-600">
            No ELD data found. Check your Samsara API key in your environment
            variables.
          </div>
        ) : (
          <Map
            initialViewState={{
              longitude: locations[0]?.lon || -97,
              latitude: locations[0]?.lat || 39,
              zoom: 4,
            }}
            style={{ width: "100%", height: "100%", minHeight: 400 }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            <NavigationControl position="top-left" />
            {locations.map(
              (d, i) =>
                d.lat &&
                d.lon && (
                  <Marker
                    key={d.id || i}
                    longitude={d.lon}
                    latitude={d.lat}
                    anchor="bottom"
                    onClick={() => setSelected(d)}
                  >
                    <div
                      className="bg-blue-600 rounded-full w-4 h-4 border-2 border-white shadow cursor-pointer"
                      title={d.name}
                    ></div>
                  </Marker>
                ),
            )}
          </Map>
        )}
      </div>
      <div className="w-full md:w-96 bg-white rounded shadow p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Driver Status</h2>
        {selected ? (
          <div className="mb-4">
            <div className="font-bold">{selected.name}</div>
            <div>Status: {selected.status}</div>
            <div>
              Last updated:{" "}
              {selected.updatedAt
                ? new Date(selected.updatedAt).toLocaleString()
                : "-"}
            </div>
            <button
              className="mt-2 px-2 py-1 bg-gray-200 rounded"
              onClick={() => setSelected(null)}
            >
              Clear
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {locations.map((d, i) => (
              <li
                key={d.id || i}
                className="border-b pb-1 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelected(d)}
              >
                <div className="font-bold">{d.name}</div>
                <div className="text-xs text-gray-500">
                  {d.status} •{" "}
                  {d.lat && d.lon
                    ? `${d.lat.toFixed(3)}, ${d.lon.toFixed(3)}`
                    : "No location"}
                </div>
              </li>
            ))}
          </ul>
        )}
        <h2 className="text-lg font-semibold mt-6 mb-2">Truck Status</h2>
        <ul className="space-y-2">
          {trucks.map((t, i) => (
            <li key={t.id || i} className="border-b pb-1">
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-gray-500">
                {t.status} •{" "}
                {t.lat && t.lon
                  ? `${t.lat.toFixed(3)}, ${t.lon.toFixed(3)}`
                  : "No location"}
              </div>
            </li>
          ))}
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">HOS Status</h2>
        <ul className="space-y-2">
          {hos.map((h, i) => (
            <li key={h.id || i} className="border-b pb-1">
              <div className="font-bold">{h.name}</div>
              <div className="text-xs text-gray-500">
                {h.hosStatus} •{" "}
                {h.updatedAt ? new Date(h.updatedAt).toLocaleString() : "-"}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
