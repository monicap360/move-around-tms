import { useState, useRef, useEffect } from "react";

export default function DispatchMessenger() {
  // Demo: in-memory chat between dispatcher and driver
  const [messages, setMessages] = useState([
    { sender: "dispatcher", text: "Welcome to Dispatch Chat!" },
    { sender: "driver", text: "Ready for my next load." },
  ]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState("dispatcher");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: role, text: input }]);
    setInput("");
  }

  return (
    <div className="bg-white border rounded-xl p-4 max-w-md mx-auto flex flex-col h-96">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold">Role:</span>
        <select className="border rounded px-2 py-1" value={role} onChange={e => setRole(e.target.value)}>
          <option value="dispatcher">Dispatcher</option>
          <option value="driver">Driver</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 mb-2 bg-gray-50 p-2 rounded">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender === "dispatcher" ? "text-right" : "text-left"}>
            <span className={msg.sender === "dispatcher" ? "bg-blue-100 text-blue-800 px-2 py-1 rounded" : "bg-green-100 text-green-800 px-2 py-1 rounded"}>
              <b>{msg.sender === "dispatcher" ? "Dispatcher" : "Driver"}:</b> {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
        />
        <button
          className="bg-blue-600 text-white rounded px-4 py-1 font-semibold"
          onClick={sendMessage}
        >Send</button>
      </div>
    </div>
  );
}
