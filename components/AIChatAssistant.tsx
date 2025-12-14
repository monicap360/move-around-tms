"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, Settings, EyeOff, Eye, Clock } from "lucide-react";

// Peak quiet hours
const QUIET_HOURS = [
  { start: 5, end: 11 },  // Morning dispatch rush
  { start: 15, end: 18 }, // Afternoon congestion
];

export default function AIChatAssistant() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stressHidden, setStressHidden] = useState(false);
  const [contextHidden, setContextHidden] = useState(false);

  // 1. Quiet hours auto-hide
  function isQuietHour() {
    const now = new Date();
    const hour = now.getHours();
    return QUIET_HOURS.some((block) => hour >= block.start && hour < block.end);
  }

  // 2. Stress-load detection
  async function checkStressLoad() {
    try {
      const res = await fetch("/api/system/stress");
      const data = await res.json();
      if (
        data.late_tickets > 10 ||
        data.exceptions > 15 ||
        data.ocr_queue > 8 ||
        data.cycle_spike === true
      ) {
        setStressHidden(true);
      } else {
        setStressHidden(false);
      }
    } catch (e) {}
  }

  // 3. Context-aware visibility
  function evaluateContext() {
    // Hide on certain pages
    const path = window.location.pathname;
    const restricted = [
      "/driver",
      "/login",
      "/onboarding",
      "/apply",
      "/manual-entry",
      "/upload-csv",
    ];
    if (restricted.some((r) => path.includes(r))) {
      setContextHidden(true);
    } else {
      setContextHidden(false);
    }
  }

  // Load hide preferences and apply adaptive behaviors
  useEffect(() => {
    const alwaysHide = localStorage.getItem("ai_hide_permanent");
    const hideUntil = localStorage.getItem("ai_hide_until");
    if (alwaysHide === "true") {
      setHidden(true);
      return;
    }
    if (hideUntil && Date.now() < Number(hideUntil)) {
      setHidden(true);
      return;
    }
    if (isQuietHour()) setHidden(true);
    evaluateContext();
    checkStressLoad();
    // Re-evaluate every minute
    const interval = setInterval(() => {
      evaluateContext();
      checkStressLoad();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function hideFor24Hours() {
    const expire = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("ai_hide_until", String(expire));
    setHidden(true);
  }

  function hidePermanently() {
    localStorage.setItem("ai_hide_permanent", "true");
    setHidden(true);
  }

  function unhide() {
    localStorage.removeItem("ai_hide_until");
    localStorage.removeItem("ai_hide_permanent");
    setHidden(false);
  }

  async function sendMessage() {
    if (!msg.trim()) return;
    const userMsg = msg;
    setChat([...chat, { role: "user", content: userMsg }]);
    setMsg("");
    setLoading(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: userMsg }),
    });
    const data = await res.json();
    setChat((c) => [...c, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  // If hidden by user, quiet hours, stress load, or context → shrink to restore button
  if (hidden || stressHidden || contextHidden) {
    return (
      <button
        onClick={unhide}
        className="fixed bottom-6 right-6 bg-gray-700 text-white text-xs px-3 py-2 rounded-full opacity-70 hover:opacity-100"
      >
        <Eye className="inline-block w-4 h-4 mr-1" />
        Show AI Assistant
      </button>
    );
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setOpen(!open);
          setShowSettings(false);
        }}
        className="fixed bottom-6 right-6 bg-blue-600 p-4 rounded-full shadow-2xl hover:bg-blue-500 text-white transition"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 bg-[#0e1116] w-80 h-96 border border-white/20 shadow-xl rounded-xl p-4 flex flex-col text-white backdrop-blur-lg">
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold">AI Assistant</p>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/70 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          {showSettings && (
            <div className="bg-white/10 p-3 rounded-lg mb-3 text-sm space-y-2">
              <button
                onClick={hideFor24Hours}
                className="flex items-center gap-2 text-yellow-300 hover:text-yellow-200"
              >
                <Clock className="w-4 h-4" />
                Hide for 24 hours
              </button>
              <button
                onClick={hidePermanently}
                className="flex items-center gap-2 text-red-300 hover:text-red-200"
              >
                <EyeOff className="w-4 h-4" />
                Hide permanently
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-3">
            {chat.map((c, i) => (
              <p
                key={i}
                className={c.role === "user" ? "text-blue-300" : "text-green-300"}
              >
                {c.content}
              </p>
            ))}
            {loading && <p className="text-gray-400 animate-pulse">AI thinking…</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 p-2 rounded-lg text-white"
              placeholder="Ask AI…"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
