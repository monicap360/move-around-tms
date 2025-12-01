"use client";

import { useEffect, useState } from "react";

export default function OCRPipeline() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const sse = new EventSource("/api/ocr/stream");

    sse.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setQueue(d.queue);
    };

    return () => sse.close();
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5 h-[480px] flex flex-col">
      <h2 className="font-semibold text-xl mb-3">OCR Pipeline</h2>
      <div className="opacity-70 text-sm mb-2">Tickets AI Processing</div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {queue.map((t, i) => (
          <div
            key={i}
            className="glass-card p-3 rounded-lg border border-cyan-400/30"
          >
            <p className="font-semibold text-sm">{t.ticket_id}</p>
            <p className="opacity-60 text-xs">Status: {t.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
