"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Camera,
  Download,
  FileText,
  User,
  Truck,
  DollarSign,
  Calendar,
  MapPin,
} from "lucide-react";
import ConfidenceBadge from "@/components/data-confidence/ConfidenceBadge";

interface MobileTicketDetailProps {
  ticket: any;
  onBack: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onUploadPhoto?: () => void;
}

export default function MobileTicketDetail({
  ticket,
  onBack,
  onApprove,
  onReject,
  onUploadPhoto,
}: MobileTicketDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      invoiced: "bg-blue-100 text-blue-800",
      paid: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10 p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{ticket.ticket_number}</h1>
          <p className="text-sm text-gray-600">{ticket.customer_name}</p>
        </div>
        {getStatusBadge(ticket.status)}
      </div>

      <div className="p-4 space-y-4">
        {/* Financial Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-green-600">
                ${ticket.total_amount?.toLocaleString() || "0"}
              </p>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-600">Quantity</p>
                <p className="font-semibold">
                  {ticket.quantity} {ticket.unit}
                </p>
                {ticket.confidence?.quantity && (
                  <div className="mt-1">
                    <ConfidenceBadge
                      score={ticket.confidence.quantity.score}
                      reason={ticket.confidence.quantity.reason}
                      fieldName="quantity"
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-600">Rate</p>
                <p className="font-semibold">${ticket.rate?.toFixed(2) || "0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Driver</p>
                <p className="font-medium">{ticket.driver_name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Truck</p>
                <p className="font-medium">{ticket.truck_number || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Material</p>
                <p className="font-medium">{ticket.material_type || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Date</p>
                <p className="font-medium">
                  {ticket.ticket_date
                    ? new Date(ticket.ticket_date).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {ticket.status === "pending" && (
          <div className="space-y-2">
            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              onClick={onApprove}
            >
              <CheckCircle className="w-5 h-5" />
              Approve Ticket
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 border-red-300 text-red-600"
              onClick={onReject}
            >
              <XCircle className="w-5 h-5" />
              Reject Ticket
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-5 h-5" />
              Upload Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0] && onUploadPhoto) {
                  onUploadPhoto();
                  // Handle file upload here
                }
              }}
            />
          </div>
        )}

        {/* Notes */}
        {ticket.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{ticket.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
