"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

type Doc = {
  id: string;
  doc_type: string;
  full_name: string | null;
  license_number: string | null;
  state: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  image_url: string | null;
  ocr_confidence: number | null;
  auto_matched: boolean;
  driver_matched_confidence: number | null;
  drivers: { id: string; name: string } | null;
};

export default function ReviewDocsPage() {
  const [adminToken, setAdminToken] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const directImageLoader = ({ src }: { src: string }) => src;

  useEffect(() => {
    if (adminToken) {
      loadDocs();
      loadDrivers();
    }
  }, [adminToken]);

  const loadDocs = async () => {
    try {
      const res = await fetch("/api/admin/hr/pending-docs", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load docs");
      setDocs(data.documents || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (res.ok) setDrivers(data.users || []);
    } catch {}
  };

  const action = async (documentId: string, action: string, payload?: any) => {
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/hr/review-doc", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ documentId, action, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.message || "Failed to update");
    else {
      setSuccess(`Document ${action}d`);
      loadDocs();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {!adminToken && (
        <Card className="shadow-lg border bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Admin Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your admin token"
              />
              <button
                onClick={() => loadDocs()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Load
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Manager Review - HR Documents</CardTitle>
          <p className="text-sm text-blue-100">
            Approve, deny, edit, or reassign scanned HR docs
          </p>
        </CardHeader>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {adminToken && docs.length === 0 && (
        <p className="text-gray-500 text-center py-8">No pending documents</p>
      )}

      <div className="space-y-4">
        {docs.map((doc) => (
          <Card key={doc.id} className="shadow-lg border bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">{doc.doc_type}</h3>
                  <p className="text-sm text-gray-700">
                    Name:{" "}
                    <span className="font-semibold">
                      {doc.full_name || "—"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    License #:{" "}
                    <span className="font-semibold">
                      {doc.license_number || "—"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    State:{" "}
                    <span className="font-semibold">{doc.state || "—"}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Issue:{" "}
                    <span className="font-semibold">
                      {doc.issue_date || "—"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Expires:{" "}
                    <span className="font-semibold">
                      {doc.expiration_date || "—"}
                    </span>
                  </p>
                  {doc.ocr_confidence && (
                    <p className="text-xs text-gray-500">
                      OCR: {doc.ocr_confidence}%
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Assigned Driver
                  </label>
                  {doc.drivers ? (
                    <p className="text-sm font-semibold">
                      {doc.drivers.name}
                      {doc.auto_matched && doc.driver_matched_confidence && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Auto-matched ({doc.driver_matched_confidence}%)
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">Unassigned</p>
                  )}
                  <select
                    onChange={(e) =>
                      e.target.value &&
                      action(doc.id, "reassign", { driverId: e.target.value })
                    }
                    className="w-full px-2 py-2 border rounded text-sm"
                    defaultValue=""
                  >
                    <option value="">Reassign Driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => action(doc.id, "approve")}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => action(doc.id, "deny")}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                  >
                    ✗ Deny
                  </button>
                  {doc.image_url && (
                    <div className="space-y-2">
                      {(() => {
                        const url = doc.image_url!;
                        const isPdf = url.toLowerCase().endsWith(".pdf");
                        const isImage = /(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return (
                          <>
                            {isImage && (
                              <Image
                                src={url}
                                alt="Document preview"
                                width={640}
                                height={160}
                                className="w-full h-40 object-contain border rounded"
                                loader={directImageLoader}
                                unoptimized
                              />
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full inline-block text-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                            >
                              {isPdf ? "View PDF" : "View Image"}
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
