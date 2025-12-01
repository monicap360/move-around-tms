import { useParams } from "next/navigation";

export default function CompanyTicketDetailPage() {
  const params = useParams();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Ticket Details</h1>
      <p>Viewing ticket with ID: <span className="font-mono">{params.ticket_id}</span></p>
    </main>
  );
}
