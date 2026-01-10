"use client";

import { useState, useEffect } from "react";

const DEFAULT_SETTINGS = {
  enabled: true,
  silent_hours_start: "21:00",
  silent_hours_end: "06:00",
  hide_when_not_used: false,
  assistant_style: "tesla",
};

export default function AISettingsPage({ params }: any) {
  const company = params.company;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/company/${company}/settings/ai`)
      .then(res => res.json())
      .then(data => {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setLoading(false);
      });
  }, [company]);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/company/${company}/settings/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  function updateField(field: string, value: any) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl shadow-xl mt-10">
      <h1 className="text-2xl font-bold mb-6">AI Assistant Settings</h1>
      {loading ? (
        <div className="text-blue-500">Loading…</div>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            saveSettings();
          }}
          className="space-y-6"
        >
          <div>
            <label className="font-semibold">Enable AI Assistant</label>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={e => updateField("enabled", e.target.checked)}
              className="ml-3"
            />
          </div>

          <div>
            <label className="font-semibold">Silent Hours Start</label>
            <input
              type="text"
              value={settings.silent_hours_start}
              onChange={e => updateField("silent_hours_start", e.target.value)}
              className="w-full mt-1 p-2 border rounded"
              placeholder="21:00"
            />
          </div>

          <div>
            <label className="font-semibold">Silent Hours End</label>
            <input
              type="text"
              value={settings.silent_hours_end}
              onChange={e => updateField("silent_hours_end", e.target.value)}
              className="w-full mt-1 p-2 border rounded"
              placeholder="06:00"
            />
          </div>

          <div>
            <label className="font-semibold">Hide When Not Used</label>
            <input
              type="checkbox"
              checked={settings.hide_when_not_used}
              onChange={e => updateField("hide_when_not_used", e.target.checked)}
              className="ml-3"
            />
          </div>

          <div>
            <label className="font-semibold">Assistant Style</label>
            <select
              value={settings.assistant_style}
              onChange={e => updateField("assistant_style", e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            >
              <option value="tesla">Tesla</option>
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-500 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
          {saved && <div className="text-green-500 mt-2">Settings saved!</div>}
        </form>
      )}
    </div>
  );
}
