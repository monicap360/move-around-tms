"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Card, Button, Badge } from "@/components/ui";

type TicketResponse = {
  ticket: {
    id: string;
    ticket_number: string;
    ticket_date: string;
    unit_type: string;
    quantity: number;
    pay_rate: number;
    bill_rate: number;
    total_pay: number;
    total_bill: number;
    total_profit: number;
    status: string;
    notes: string | null;
    ocr_status: string | null;
    created_at: string;
  };
  driver: { id: string; name: string } | null;
  customer: { id: string; company_name: string } | null;
};

export default function FastScanTicketDetails() {
  const { ticket_id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Fetch company features
  useEffect(() => {
    fetch("/api/company/me")
      .then((res) => res.json())
      .then(setCompany)
      .finally(() => setCompanyLoading(false));
  }, []);

  // Redirect if Fast Scan is not enabled
  useEffect(() => {
    if (!companyLoading && company && !company.features?.fastscan) {
      router.push("/company/billing");
    }
  }, [companyLoading, company, router]);

  // Fetch ticket details
  useEffect(() => {
    if (!ticket_id) return;
    fetch(`/api/fastscan/ticket/${ticket_id}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [ticket_id]);

  if (companyLoading || loading) {
    return <div className="p-6">Loading ticket…</div>;
  }

  if (!data || !data.ticket) {
    return <div className="p-6">Ticket not found.</div>;
  }

  const { ticket, driver, customer } = data;

  return (
    <>
      <PageHeader
        title={`Ticket ${ticket.ticket_number}`}
        subtitle="Fast Scan ticket details"
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-muted">Driver</div>
            <div className="font-medium">{driver?.name ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-muted">Customer</div>
            <div className="font-medium">{customer?.company_name ?? "—"}</div>
          </div>

          <div>
            <div className="text-sm text-muted">Ticket Date</div>
            <div className="font-medium">{ticket.ticket_date}</div>
          </div>

          <div>
            <div className="text-sm text-muted">Status</div>
            <Badge status={ticket.status}>{ticket.status}</Badge>
          </div>

          <div>
            <div className="text-sm text-muted">Quantity</div>
            <div className="font-medium">
              {ticket.quantity} {ticket.unit_type}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted">Total Profit</div>
            <div className="font-medium">${ticket.total_profit.toFixed(2)}</div>
          </div>
        </div>
      </Card>
    </>
  );
}
