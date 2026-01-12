import { useEffect, useRef, useState } from "react";
import { fetchMockTrackingData } from "@/app/tracking/trackingDataProvider";

// IMPORTANT: Replace with your Mapbox access token
const MAPBOX_TOKEN = "YOUR_MAPBOX_ACCESS_TOKEN";

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);

  useEffect(() => {
    fetchMockTrackingData().then(setTrucks);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-95, 39],
        zoom: 3.5,
      });
      mapRef.current = map;
      // Add truck markers from tracking data
      trucks.forEach((truck) => {
        new mapboxgl.default.Marker({ color: truck.status === "critical" ? "#dc2626" : truck.status === "delayed" ? "#f59e42" : "#22c55e" })
          .setLngLat([truck.lng, truck.lat])
          .setPopup(new mapboxgl.default.Popup().setText(`${truck.truckNumber} (${truck.driverName})\nStatus: ${truck.status}`))
          .addTo(map);
      });
    });
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [trucks]);

  return (
    <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px]">
      <div ref={mapContainer} className="w-full h-64 rounded mb-4" style={{ minHeight: 256 }} />
      <div className="text-gray-700 text-center">
        Live fleet map demo. <span className="text-xs text-gray-400">(Replace token, connect to real truck GPS for production.)</span>
      </div>
    </div>
  );
}
