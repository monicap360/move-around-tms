import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
export default function FastScanSupportChat() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 30000); // Show after 30s
    return () => clearTimeout(timer);
  }, []);

  // Supabase realtime subscription
  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      const { data } = await supabase
        .from('fastscan_support_messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(50);
      if (!ignore && data) setMessages(data);
    }
    fetchInitial();
    const sub = supabase
      .channel('fastscan_support_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fastscan_support_messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(sub);
    };
  }, []);

  async function handleSend() {
    if (!input.trim()) return;
    await supabase.from('fastscan_support_messages').insert([
      {
        sender: 'user',
        text: input,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput("");
  }

  return (
    <>
      {/* Floating '?' Button, shown after delay */}
      {visible && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="fixed bottom-6 right-6 z-50 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full shadow-lg p-2 flex items-center justify-center"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)", width: 40, height: 40 }}
          aria-label="Open Fast Scan Support Chat"
          title="Need help?"
        >
          <span style={{ fontSize: 22, fontWeight: "bold" }}>?</span>
        </button>
      )}
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-72 bg-white rounded-xl shadow-2xl border border-cyan-300 flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-cyan-600 text-white px-3 py-2 flex items-center justify-between">
            <span className="font-bold text-base">Fast Scan Support</span>
            <button onClick={() => setOpen(false)} className="text-white text-lg">×</button>
          </div>
          <div className="flex-1 px-3 py-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`mb-2 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-2 py-1 rounded-lg text-sm max-w-[70%] ${
                    msg.sender === "ai"
                      ? "bg-cyan-100 text-cyan-900"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t bg-gray-50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-2 py-1 rounded border border-cyan-300 focus:outline-none text-sm"
              placeholder="Type your question..."
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              className="bg-cyan-600 text-white px-3 py-1 rounded font-semibold text-sm"
            >
              Send
            </button>
          </div>
          <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
            <a href="/faq" className="underline text-cyan-700 mr-2">FAQ</a>
            <a href="/sample-ticket-template.csv" className="underline text-cyan-700 mr-2">Sample CSV</a>
            <a href="mailto:support@movearoundtms.com" className="underline text-cyan-700">Contact Support</a>
          </div>
        </div>
      )}
    </>
  );
}
