"use client";
import { useRef, useState } from "react";
import { Button } from "../../components/ui/button";

export default function WhiteLabelSettings() {
  const [logo, setLogo] = useState<string | null>(null);
  const [theme, setTheme] = useState("default");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLogo(url);
    }
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">White-Label Branding</h2>
      <form className="space-y-6" onSubmit={handleSave}>
        <div>
          <label className="block text-sm font-medium mb-1">Logo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="border rounded px-3 py-2"
          />
          {logo && <img src={logo} alt="Logo preview" className="mt-2 h-12" />}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="default">Default</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="dark">Dark</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Custom Domain
          </label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="portal.yourcompany.com"
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
      <div className="text-xs text-gray-500 mt-4">
        Branding and domain changes are visible to all users in your company.
      </div>
    </div>
  );
}
