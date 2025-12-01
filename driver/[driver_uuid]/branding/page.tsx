"use client";
import { useState, useEffect } from "react";

export default function TruckBrandingPage({ params }) {
  const [driver, setDriver] = useState(null);
  const [truckSkin, setTruckSkin] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Fetch profile
  useEffect(() => {
    async function loadProfile() {
      const res = await fetch(`/api/drivers/${params.driver_uuid}/profile`);
      const data = await res.json();
      setDriver(data);
      setTruckSkin(data.truck_skin || "");
      setLogoUrl(data.custom_logo_url || "");
    }
    loadProfile();
  }, [params.driver_uuid]);

  async function updateBranding() {
    await fetch(`/api/drivers/${params.driver_uuid}/update-brand`, {
      method: "POST",
      body: JSON.stringify({
        truck_skin: truckSkin,
        custom_logo_url: logoUrl,
      }),
    });
    alert("Branding updated!");
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      // Get signed upload URL
      const fileName = `${params.driver_uuid}_${Date.now()}_${file.name}`;
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_uuid: params.driver_uuid, file_name: fileName }),
      });
      const data = await res.json();
      if (!data.url) throw new Error("Failed to get upload URL");
      // Upload file to Supabase Storage
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      // Set logo URL to public path
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/driver-logos/${fileName}`;
      setLogoUrl(publicUrl);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!driver) return <div className="text-white p-6">Loading…</div>;

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold">Customize Your Truck</h1>
      <p className="opacity-60">{driver.full_name}</p>
      {/* Truck Preview */}
      <div className="mt-6 p-4 bg-gray-900 rounded-xl text-center">
        <img
          src={`/truck-skins/${truckSkin}.png`}
          alt="Truck Preview"
          className="w-full max-w-md mx-auto"
        />
        {logoUrl && (
          <img
            src={logoUrl}
            className="w-24 h-24 mx-auto mt-4 opacity-90"
            alt="Custom Logo"
          />
        )}
      </div>
      {/* Color Options */}
      <h2 className="text-xl mt-6 mb-2 font-semibold">Select Truck Color</h2>
      <div className="grid grid-cols-3 gap-3">
        {["black", "white", "blue", "red", "green", "silver"].map((color) => (
          <button
            key={color}
            onClick={() => setTruckSkin(color)}
            className={`p-3 rounded-xl text-black font-bold ${
              truckSkin === color ? "ring-4 ring-blue-500" : ""
            }`}
            style={{ backgroundColor: color }}
          >
            {color}
          </button>
        ))}
      </div>
      {/* Logo Upload */}
      <h2 className="text-xl mt-6 mb-2 font-semibold">Custom Logo</h2>
      <input
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="w-full p-3 rounded-lg text-black bg-white"
        disabled={uploading}
      />
      {uploading && <div className="text-blue-400 mt-2">Uploading…</div>}
      {uploadError && <div className="text-red-400 mt-2">{uploadError}</div>}
      {/* Logo URL (manual entry) */}
      <h2 className="text-xl mt-6 mb-2 font-semibold">Or Enter Logo URL</h2>
      <input
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="Enter image URL"
        className="w-full p-3 rounded-lg text-black"
      />
      <button
        onClick={updateBranding}
        className="mt-6 px-4 py-3 bg-blue-600 rounded-lg text-white font-bold"
        disabled={uploading}
      >
        Save Branding
      </button>
    </div>
  );
}
