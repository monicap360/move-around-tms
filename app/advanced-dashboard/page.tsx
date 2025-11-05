"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedAnalyticsDashboard from "../components/AdvancedAnalyticsDashboard";
import LoadBoard from "../components/LoadBoard";
import { 
  BarChart3,
  Truck,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  Package,
  Calendar,
  Wrench
} from "lucide-react";

export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Ronyx Logistics Command Center
          </h1>
          <p className="text-gray-600 text-lg">
            Enterprise transportation management and business intelligence
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Active Loads</p>
                  <p className="text-3xl font-bold">24</p>
                  <p className="text-sm text-blue-100">+3 from yesterday</p>
                </div>
                <Package className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Revenue (30d)</p>
                  <p className="text-3xl font-bold">$247K</p>
                  <p className="text-sm text-green-100">+12% vs last month</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Fleet Utilization</p>
                  <p className="text-3xl font-bold">87%</p>
                  <p className="text-sm text-purple-100">18 of 21 trucks active</p>
                </div>
                <Truck className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Safety Score</p>
                  <p className="text-3xl font-bold">94</p>
                  <p className="text-sm text-orange-100">Excellent rating</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-96">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="loadboard" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Load Board
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <AdvancedAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="loadboard" className="space-y-6">
            <LoadBoard />
          </TabsContent>

          <TabsContent value="dispatch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Control Center</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Advanced Dispatch Module
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Real-time load management, driver assignments, and route optimization
                  </p>
                  <div className="space-y-2 text-sm text-gray-600 max-w-md mx-auto">
                    <p>✓ Live GPS tracking and geofencing</p>
                    <p>✓ Automated driver-load matching</p>
                    <p>✓ Route optimization with traffic data</p>
                    <p>✓ Two-way driver communication</p>
                    <p>✓ Customer delivery notifications</p>
                  </div>
                  <Button className="mt-6">Coming Soon</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: "2 hours ago", event: "Load LD-2024-001 assigned to Driver Mike T.", type: "dispatch" },
                      { time: "4 hours ago", event: "DVIR completed for Truck T-042", type: "maintenance" },
                      { time: "6 hours ago", event: "New load posted: Houston → Atlanta", type: "load" },
                      { time: "1 day ago", event: "Invoice INV-2024-156 paid by customer", type: "finance" },
                      { time: "1 day ago", event: "Driver Sarah M. completed delivery", type: "delivery" }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.event}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Alerts & Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Critical Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          DOT Registration expires in 7 days
                        </p>
                        <p className="text-xs text-red-600">Truck T-038</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Calendar className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Driver medical certificate expires soon
                        </p>
                        <p className="text-xs text-yellow-600">John D. - Expires Nov 15</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <Wrench className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Maintenance due for Truck T-025
                        </p>
                        <p className="text-xs text-orange-600">15,000 miles overdue</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}