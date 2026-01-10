"use client";

import { useParams } from "next/navigation";

export default function TicketDetailPage() {
  const params = useParams();

  return (
    <div>
      Ticket ID: {params.ticketId}
    </div>
  );
}
