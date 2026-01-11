import { useEffect, useRef } from "react";

// IMPORTANT: Replace with your Mapbox access token
const MAPBOX_TOKEN = "YOUR_MAPBOX_ACCESS_TOKEN";

const demoTrucks = [
  { id: "T-101", lat: 40.7128, lng: -74.0060, label: "NYC" },
  { id: "T-202", lat: 41.8781, lng: -87.6298, label: "Chicago" },
  { id: "T-303", lat: 34.0522, lng: -118.2437, label: "LA" },
];

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    // Dynamically load Mapbox GL JS
    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-95, 39],
        zoom: 3.5,
      });
      mapRef.current = map;
      // Add demo truck markers
      demoTrucks.forEach((truck) => {
        new mapboxgl.default.Marker()
          .setLngLat([truck.lng, truck.lat])
          .setPopup(new mapboxgl.default.Popup().setText(`${truck.id} (${truck.label})`))
          .addTo(map);
      });
    });
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px]">
      <div ref={mapContainer} className="w-full h-64 rounded mb-4" style={{ minHeight: 256 }} />
      <div className="text-gray-700 text-center">
        Live fleet map demo. <span className="text-xs text-gray-400">(Replace token, connect to real truck GPS for production.)</span>
      </div>
    </div>
  );
}
