"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Camera,
  FileText,
  User,
  Truck,
  DollarSign,
  Calendar,
  Eye,
  ChevronRight,
} from "lucide-react";
import ConfidenceBadge from "@/components/data-confidence/ConfidenceBadge";

interface MobileTicket {
  id: string;
  ticket_number: string;
  driver_name?: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  total_amount: number;
  status: string;
  ticket_date?: string;
  confidence?: {
    quantity?: { score: number; reason: string };
  };
}

interface MobileTicketListProps {
  tickets: MobileTicket[];
  onTicketClick: (ticketId: string) => void;
  onQuickApprove?: (ticketId: string) => void;
  onQuickReject?: (ticketId: string) => void;
  onUploadPhoto?: (ticketId: string) => void;
}

export default function MobileTicketList({
  tickets,
  onTicketClick,
  onQuickApprove,
  onQuickReject,
  onUploadPhoto,
}: MobileTicketListProps) {
  return (
    <div className="space-y-3 pb-20">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="active:bg-gray-50"
          onClick={() => onTicketClick(ticket.id)}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{ticket.ticket_number}</span>
                  <Badge
                    className={
                      ticket.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : ticket.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{ticket.customer_name}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span className="truncate">{ticket.driver_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="truncate">{ticket.material_type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>
                  {ticket.quantity} {ticket.unit}
                </span>
                {ticket.confidence?.quantity && (
                  <ConfidenceBadge
                    score={ticket.confidence.quantity.score}
                    reason={ticket.confidence.quantity.reason}
                    fieldName="quantity"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <DollarSign className="w-4 h-4" />
                <span>${ticket.total_amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Actions */}
            {ticket.status === "pending" && (
              <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                {onQuickApprove && (
                  <Button
                    size="sm"
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => onQuickApprove(ticket.id)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                )}
                {onQuickReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => onQuickReject(ticket.id)}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                )}
                {onUploadPhoto && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => onUploadPhoto(ticket.id)}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
