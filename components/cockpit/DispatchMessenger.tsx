"use client";
import { useState } from "react";

export default function DispatchMessenger({ driver }) {
  const [messages, setMessages] = useState([
    { from: "Dispatcher", text: "Pickup at Plant 3 at 8am." },
    { from: "You", text: "On my way!" }
  ]);
  const [input, setInput] = useState("");

  function sendMessage() {
    if (!input) return;
    setMessages([...messages, { from: "You", text: input }]);
    setInput("");
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Dispatch Messenger</h2>
      <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "You" ? "text-right" : "text-left"}>
            <span className="font-semibold">{m.from}:</span> {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 rounded bg-gray-800 border border-gray-700"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="px-3 py-1 bg-blue-600 rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
