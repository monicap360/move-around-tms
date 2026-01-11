import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type DriverMessage = {
  id: string;
  driver_name: string;
  message: string;
  sent_at?: string;
};

export default function MessagesPanel() {
  const [messages, setMessages] = useState<DriverMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("driver_messages")
        .select("id, driver_name, message, sent_at")
        .order("sent_at", { ascending: false })
        .limit(10);
      if (error) {
        setError(error.message);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    }
    fetchMessages();
  }, []);

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="font-semibold mb-2">Messages</div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul className="space-y-2">
          {messages.length === 0 ? (
            <li>No messages found.</li>
          ) : (
            messages.map((msg) => (
              <li key={msg.id}>
                <span className="font-bold">{msg.driver_name}:</span>{" "}
                {msg.message}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
