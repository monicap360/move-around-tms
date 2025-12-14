"use client";

import React from "react";

interface SystemCardProps {
  title: string;
  items?: any[];
  value?: number | string | null;
  type: "uploads" | "fleet" | "loads" | "tickets" | "pay";
}

export default function SystemCard({ title, items = [], value, type }: SystemCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {/* PAY CARD */}
      {type === "pay" && (
        <div>
          <p className="text-3xl font-bold mb-4">${Number(value || 0).toLocaleString()}</p>
          <p className="text-gray-500 text-sm">Month-to-date total</p>
        </div>
      )}

      {/* LIST-BASED CARDS */}
      {["uploads", "fleet", "loads", "tickets"].includes(type) && (
        <div className="space-y-3">
          {items && items.length > 0 ? (
            items.map((item: any) => (
              <div
                key={item.id}
                className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center"
              >
                {/* OCR Uploads */}
                {type === "uploads" && (
                  <>
                    <div>
                      <p className="font-medium">{item.filename}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={item.file_url}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </>
                )}

                {/* Fleet */}
                {type === "fleet" && (
                  <>
                    <div>
                      <p className="font-medium">{item.unit_number}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                    <div className="text-gray-500">{item.status}</div>
                  </>
                )}

                {/* Loads */}
                {type === "loads" && (
                  <>
                    <div>
                      <p className="font-medium">Load #{item.load_number}</p>
                      <p className="text-xs text-gray-500">
                        {item.origin} → {item.destination}
                      </p>
                    </div>
                    <div className="text-gray-500">{item.status}</div>
                  </>
                )}

                {/* Tickets */}
                {type === "tickets" && (
                  <>
                    <div>
                      <p className="font-medium">Ticket #{item.ticket_number}</p>
                      <p className="text-xs text-gray-500">
                        {item.material} — {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-gray-500">{item.paid ? "Paid" : "Unpaid"}</div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm italic">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}
