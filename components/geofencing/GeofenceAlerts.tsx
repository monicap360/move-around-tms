"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, MapPin, X, Bell } from "lucide-react";
import { toast } from "react-hot-toast";

interface GeofenceEvent {
  id: string;
  geofence_id: string;
  event_type: "entry" | "exit" | "inside" | "violation";
  location: { lat: number; lng: number };
  timestamp: string;
  metadata: any;
  geofences?: {
    name: string;
    type: string;
  };
  acknowledged: boolean;
}

export default function GeofenceAlerts({
  organizationId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: {
  organizationId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/geofencing/events?organizationId=${organizationId}&limit=50&acknowledged=false`
      );
      const data = await response.json();
      setEvents(data.events || []);
      setUnacknowledgedCount(
        (data.events || []).filter((e: GeofenceEvent) => !e.acknowledged).length
      );

      // Show toast for new violations
      (data.events || []).forEach((event: GeofenceEvent) => {
        if (event.event_type === "violation" && !event.acknowledged) {
          toast.error(
            `Geofence Violation: ${event.metadata?.message || "Unauthorized access"}`
          );
        }
      });
    } catch (error) {
      console.error("Failed to fetch geofence events:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchEvents();

    if (autoRefresh) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchEvents, autoRefresh, refreshInterval]);

  const handleAcknowledge = async (eventId: string) => {
    try {
      const response = await fetch("/api/geofencing/events/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, acknowledged: true } : e))
        );
        setUnacknowledgedCount((prev) => Math.max(0, prev - 1));
        toast.success("Event acknowledged");
      }
    } catch (error) {
      console.error("Failed to acknowledge event:", error);
      toast.error("Failed to acknowledge event");
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "entry":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "exit":
        return <X className="w-5 h-5 text-blue-500" />;
      case "violation":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "entry":
        return "bg-green-50 border-green-200";
      case "exit":
        return "bg-blue-50 border-blue-200";
      case "violation":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Loading events...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Geofence Events
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive">{unacknowledgedCount}</Badge>
            )}
          </CardTitle>
          <Button onClick={fetchEvents} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent geofence events
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${getEventColor(
                  event.event_type
                )} ${event.acknowledged ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1">
                    {getEventIcon(event.event_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{event.event_type}</Badge>
                        {event.geofences && (
                          <span className="font-semibold text-sm">
                            {event.geofences.name}
                          </span>
                        )}
                      </div>
                      {event.metadata?.message && (
                        <p className="text-sm text-gray-700 mb-1">
                          {event.metadata.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Location: {event.location.lat.toFixed(4)},{" "}
                        {event.location.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  {!event.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(event.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
