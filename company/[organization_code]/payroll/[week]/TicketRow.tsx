"use client";

export default function TicketRow({ ticket }) {
  async function updateStatus(newStatus) {
    await fetch("/api/tickets/update-status", {
      method: "POST",
      body: JSON.stringify({
        ticket_id: ticket.id,
        status: newStatus,
      }),
    });
    location.reload();
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded mb-2">
      <div>
        <p className="font-semibold">Ticket #{ticket.id}</p>
        <p className="text-sm text-gray-500">{ticket.material_name}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => updateStatus("approved")}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Approve
        </button>

        <button
          onClick={() => updateStatus("edit_required")}
          className="bg-yellow-600 text-white px-3 py-1 rounded"
        >
          Edit
        </button>

        <button
          onClick={() => updateStatus("denied")}
          className="bg-red-600 text-white px-3 py-1 rounded"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
