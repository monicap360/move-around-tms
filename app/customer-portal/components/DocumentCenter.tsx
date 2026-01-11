"use client";
import { useRef, useState } from "react";
import { Button } from "../../components/ui/button";

interface Doc {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

const docTypes = [
  { value: "bol", label: "Bill of Lading (BOL)" },
  { value: "pod", label: "Proof of Delivery (POD)" },
  { value: "compliance", label: "Compliance Document" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "other", label: "Other" }
];

export default function DocumentCenter() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("bol");
  const fileRef = useRef<HTMLInputElement>(null);

  // Simulate upload to Supabase Storage
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return;
    setUploading(true);
    const file = fileRef.current.files[0];
    setTimeout(() => {
      setDocs(prev => [
        {
          id: Date.now().toString(),
          name: file.name,
          type,
          url: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString()
        },
        ...prev
      ]);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }, 1200);
  };

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">Document Center</h2>
      <form className="flex flex-col md:flex-row gap-4 mb-6" onSubmit={handleUpload}>
        <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-3 py-2">
          {docTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
        </select>
        <input ref={fileRef} type="file" required className="border rounded px-3 py-2" />
        <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Uploaded</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr><td colSpan={4} className="text-gray-400 p-4 text-center">No documents uploaded yet.</td></tr>
            )}
            {docs.map(doc => (
              <tr key={doc.id}>
                <td className="p-2 capitalize">{docTypes.find(dt => dt.value === doc.type)?.label || doc.type}</td>
                <td className="p-2">{doc.name}</td>
                <td className="p-2">{new Date(doc.uploadedAt).toLocaleString()}</td>
                <td className="p-2">
                  <a href={doc.url} download={doc.name} className="text-blue-600 underline">Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
