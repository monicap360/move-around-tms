"use client";
import { useEffect, useState, useRef } from "react";
const SKINS = [
  { name: "Matte Black", value: "matte-black", color: "#222" },
  { name: "Chrome", value: "chrome", color: "#e5e5e5" },
  { name: "Metallic Blue", value: "metallic-blue", color: "#3b82f6" },
  { name: "Gold Elite", value: "gold-elite", color: "#ffd700" },
  { name: "Titan Red", value: "titan-red", color: "#dc2626" },
  { name: "Neon Cyan", value: "neon-cyan", color: "#06b6d4" },
  { name: "Cybertruck Silver", value: "cyber-silver", color: "#bfc6c7" },
  { name: "Pearl White", value: "pearl-white", color: "#f8fafc" },
];

export default function TruckSkinSelector({ params }) {
  const [selected, setSelected] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    async function fetchSkin() {
      const res = await fetch(`/api/drivers/${params.driver_uuid}/profile`);
      const data = await res.json();
      if (data?.truck_skin) setSelected(data.truck_skin);
      if (data?.custom_logo_url) setLogoUrl(data.custom_logo_url);
    }
    fetchSkin();
  }, [params.driver_uuid]);

  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(logoFile);
    } else {
      setLogoPreview("");
    }
  }, [logoFile]);

  async function uploadLogo(file) {
    // This assumes you have an API endpoint for logo upload
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/drivers/${params.driver_uuid}/upload-logo`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.url;
  }

  async function saveSkin() {
    setSaving(true);
    let finalLogoUrl = logoUrl;
    if (logoFile) {
      finalLogoUrl = await uploadLogo(logoFile);
    }
    await fetch(`/api/drivers/${params.driver_uuid}/update-brand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ truck_skin: selected, custom_logo_url: finalLogoUrl }),
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setLogoFile(null);
    setLogoPreview("");
    setLogoUrl(finalLogoUrl);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 text-white flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400 tracking-tight drop-shadow-lg">Tesla-Style Truck Branding</h1>
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl items-start">
        {/* Live Truck Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-72 h-40 mb-4">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              <rect x="30" y="100" width="340" height="60" rx="18" fill={SKINS.find(s => s.value === selected)?.color || '#222'} stroke="#333" strokeWidth="4" />
              <polygon points="30,100 80,60 320,60 370,100" fill={SKINS.find(s => s.value === selected)?.color || '#222'} stroke="#333" strokeWidth="4" />
              {/* Wheels */}
              <circle cx="80" cy="170" r="18" fill="#222" stroke="#111" strokeWidth="6" />
              <circle cx="320" cy="170" r="18" fill="#222" stroke="#111" strokeWidth="6" />
              {/* Logo */}
              {(logoPreview || logoUrl) && (
                <image
                  href={logoPreview || logoUrl}
                  x="170"
                  y="110"
                  width="60"
                  height="40"
                  style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }}
                />
              )}
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-cyan-300 opacity-80">Live Preview</div>
          </div>
          <div className="text-center text-cyan-200 mb-2">{selected ? SKINS.find(s => s.value === selected)?.name : "Choose a skin"}</div>
        </div>
        {/* Skin and Logo Controls */}
        <div className="flex-1 flex flex-col gap-6">
          <div>
            <div className="mb-2 font-semibold text-cyan-300">Select Color/Finish</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {SKINS.map((skin) => (
                <button
                  key={skin.value}
                  onClick={() => setSelected(skin.value)}
                  className={`rounded-2xl p-4 flex flex-col items-center border-4 transition-all duration-150 shadow-lg ${selected === skin.value ? "border-cyan-400 scale-105" : "border-gray-700"}`}
                  style={{ background: skin.color }}
                  aria-pressed={selected === skin.value}
                >
                  <span className="text-base font-bold mb-1" style={{ color: selected === skin.value ? "#06b6d4" : "#222" }}>{skin.name}</span>
                  <div className="w-12 h-4 bg-white rounded" />
                  {selected === skin.value && <span className="mt-1 text-cyan-200 text-xs">Selected</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 font-semibold text-cyan-300">Custom Logo</div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-900 border border-cyan-600 text-white"
                placeholder="Paste image URL or upload below"
              />
              <button
                className="bg-cyan-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-cyan-500 transition"
                onClick={() => fileInput.current?.click()}
                type="button"
              >Upload</button>
              <input
                type="file"
                accept="image/*"
                ref={fileInput}
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setLogoFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            {(logoPreview || logoUrl) && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={logoPreview || logoUrl}
                  alt="Logo preview"
                  className="w-20 h-12 object-contain rounded shadow border border-cyan-700 bg-white"
                />
                <button
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => { setLogoFile(null); setLogoPreview(""); setLogoUrl(""); }}
                  type="button"
                >Remove</button>
              </div>
            )}
          </div>
          <button
            onClick={saveSkin}
            className="px-8 py-3 bg-cyan-600 rounded-xl text-black font-bold hover:bg-cyan-400 transition mt-2"
            disabled={saving || !selected}
          >
            {saving ? "Saving..." : "Save Skin"}
          </button>
          {success && <div className="text-green-400 mt-2">Saved!</div>}
        </div>
      </div>
    </div>
  );
}
