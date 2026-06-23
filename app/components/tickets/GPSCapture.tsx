import React, { useState } from "react";

interface GPSCaptureProps {
  onCapture: (coords: { lat: number; lng: number }) => void;
}

const GPSCapture: React.FC<GPSCaptureProps> = ({ onCapture }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleCapture = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        onCapture(coords);
      },
      (err) => setError(err.message),
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCapture}
        style={{
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "6px 16px",
          fontWeight: 600,
        }}
      >
        Capture GPS Location
      </button>
      {location && (
        <div style={{ fontSize: 14, color: "#059669", marginTop: 4 }}>
          Lat: {location.lat}, Lng: {location.lng}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 14, color: "#dc2626", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default GPSCapture;
