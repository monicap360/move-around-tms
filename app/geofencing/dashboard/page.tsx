"use client";

import { useState } from "react";
import GeofenceManager from "@/components/geofencing/GeofenceManager";
import GeofenceAlerts from "@/components/geofencing/GeofenceAlerts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Bell, Settings } from "lucide-react";

export default function GeofencingDashboard({
  params,
}: {
  params: { organizationId?: string };
}) {
  // In a real app, get organizationId from auth context
  const organizationId =
    params.organizationId || "default-org"; // Replace with actual org ID

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="w-8 h-8" />
          Geofencing Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Manage geographic boundaries and monitor vehicle movements
        </p>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts & Events
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Manage Geofences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <GeofenceAlerts
            organizationId={organizationId}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <GeofenceManager organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
