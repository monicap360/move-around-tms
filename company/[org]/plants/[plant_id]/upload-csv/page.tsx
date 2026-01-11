"use client";

import { useState } from "react";

export default function UploadPlantCSV() {
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    await fetch("./api/upload-csv", {
      method: "POST",
      body: form,
    });
  }

  return (
    <div className="p-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Upload Plant CSV</h1>

      <div className="glass-card p-6 rounded-xl">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          className="glass-card p-3 rounded-lg bg-cyan-600 text-white"
        >
          Upload CSV
        </button>
      </div>
    </div>
  );
}
