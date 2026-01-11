import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TicketUpload = {
  id: string;
  filename: string;
  status: string;
  uploaded_at?: string;
};

export default function FastScanHistory() {
  const [tickets, setTickets] = useState<TicketUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("ticket_uploads")
        .select("id, filename, status, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(10);
      if (error) {
        setError(error.message);
        setTickets([]);
      } else {
        setTickets(data || []);
      }
      setLoading(false);
    }
    fetchTickets();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
      <h3 className="font-semibold mb-2">Ticket History</h3>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul className="space-y-2">
          {tickets.length === 0 ? (
            <li>No ticket uploads found.</li>
          ) : (
            tickets.map((ticket) => (
              <li key={ticket.id} className="flex justify-between items-center">
                <span>{ticket.filename}</span>
                <span
                  className={
                    ticket.status === "OCR Complete"
                      ? "bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
                      : ticket.status === "Processing"
                        ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs"
                        : "bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                  }
                >
                  {ticket.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
