"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Simulate real-time chat with Supabase or fallback
  useEffect(() => {
    // TODO: Replace with Supabase realtime subscription
    setMessages([
      { id: "1", sender: "Support", text: "Welcome to support! How can we help?", timestamp: new Date().toISOString() }
    ]);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const msg: Message = {
      id: Date.now().toString(),
      sender: "You",
      text: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + "-r",
        sender: "Support",
        text: "Thanks for your message! We'll reply soon.",
        timestamp: new Date().toISOString()
      }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-lg shadow-lg border flex flex-col">
      <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg font-bold">Support Chat</div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2 h-64">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === "You" ? "justify-end" : "justify-start"}`}>
            <div className={`rounded px-3 py-2 max-w-[70%] text-sm ${m.sender === "You" ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800"}`}>
              <div className="font-semibold mb-1">{m.sender}</div>
              <div>{m.text}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(m.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
      <form className="flex gap-2 p-2 border-t" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="flex-1" />
        <Button type="submit" disabled={loading || !input.trim()}>Send</Button>
      </form>
    </div>
  );
}
