// Live map view UI (placeholder for integration)
export default function MapView() {
  return (
    <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-full h-64 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-500">
        [Map Placeholder]
      </div>
      <div className="text-gray-700 text-center">
        Live fleet map coming soon. Integrate with Mapbox, Google Maps, or Samsara for real-time truck locations.<br />
        <span className="text-xs text-gray-400">(Add API keys and map logic in this component.)</span>
      </div>
    </div>
  );
}
