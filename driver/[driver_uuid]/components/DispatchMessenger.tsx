"use client";

import { useEffect, useState } from "react";

export default function DispatchMessenger({ driver }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const sse = new EventSource(
      `/api/driver/${driver.uuid}/messages`
    );

    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    return () => sse.close();
  }, [driver]);

  async function sendMessage() {
    if (!input.trim()) return;

    await fetch(`/api/driver/${driver.uuid}/send`, {
      method: "POST",
      body: JSON.stringify({ text: input }),
    });

    setInput("");
  }

  return (
    <section className="glass-panel p-5 rounded-2xl flex flex-col h-96">
      <h3 className="font-bold text-xl mb-3">
        Dispatch Messenger
      </h3>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg glass-card ${
              msg.from === "driver"
                ? "self-end bg-cyan-500/20"
                : "self-start bg-emerald-400/20"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {typing && (
          <div className="opacity-60 text-sm">Dispatcher typing…</div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 glass-card p-2 rounded-lg"
          placeholder="Message dispatch…"
        />
        <button
          onClick={sendMessage}
          className="glass-card px-4 py-2 rounded-lg bg-cyan-600 text-white"
        >
          Send
        </button>
      </div>
    </section>
  );
}
