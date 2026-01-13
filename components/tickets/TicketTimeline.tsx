"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, FileText, User, AlertCircle } from "lucide-react";

interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  user?: string;
  description: string;
  type: "status_change" | "creation" | "update" | "comment";
}

interface TicketTimelineProps {
  ticketId: string;
  currentStatus: string;
  createdAt: string;
  updatedAt?: string;
}

export default function TicketTimeline({
  ticketId,
  currentStatus,
  createdAt,
  updatedAt,
}: TicketTimelineProps) {
  // Build timeline events (simplified - would fetch from audit table in production)
  const timeline: TimelineEvent[] = [
    {
      id: "1",
      status: "created",
      timestamp: createdAt,
      description: "Ticket created",
      type: "creation",
    },
  ];

  if (updatedAt && updatedAt !== createdAt) {
    timeline.push({
      id: "2",
      status: currentStatus,
      timestamp: updatedAt,
      description: `Ticket ${currentStatus}`,
      type: "status_change",
    });
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "creation":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "status_change":
        return currentStatus === "approved" ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : currentStatus === "cancelled" ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Clock className="w-4 h-4 text-yellow-500" />
        );
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "invoiced":
        return "bg-blue-500";
      case "paid":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Ticket Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event, index) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(event.status)} ${
                  index === timeline.length - 1 ? "ring-2 ring-offset-2" : ""
                }`} />
                {index < timeline.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-300 mt-1 min-h-[40px]" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  {getEventIcon(event.type)}
                  <span className="font-medium">{event.description}</span>
                </div>
                <div className="text-sm text-gray-600 ml-6">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                {event.user && (
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    by {event.user}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lifecycle Stages */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm font-medium mb-3">Lifecycle Stages</p>
          <div className="flex items-center gap-2 flex-wrap">
            {["pending", "approved", "invoiced", "paid"].map((stage) => {
              const isActive = currentStatus.toLowerCase() === stage;
              const isPast = timeline.some((e) => e.status.toLowerCase() === stage);
              return (
                <div
                  key={stage}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : isPast
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
