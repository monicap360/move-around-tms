"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Edit, AlertCircle, CheckCircle } from "lucide-react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Geofence {
  id: string;
  name: string;
  type: "circle" | "polygon" | "rectangle";
  coordinates: any;
  radius?: number;
  rules?: any;
  active: boolean;
}

export default function GeofenceManager({
  organizationId,
}: {
  organizationId: string;
}) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "circle" as "circle" | "polygon" | "rectangle",
    centerLat: "",
    centerLng: "",
    radius: "",
    active: true,
  });

  const MAPBOX_TOKEN =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja3Z4b2J6b3gwM2JwMnZxczZ6b2J6b2JwIn0.abc123";

  const fetchGeofences = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/geofencing/geofences?organizationId=${organizationId}&activeOnly=false`
      );
      const data = await response.json();
      setGeofences(data.geofences || []);
    } catch (error) {
      console.error("Failed to fetch geofences:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let coordinates: any = {};
    if (formData.type === "circle") {
      coordinates = {
        center: {
          lat: Number(formData.centerLat),
          lng: Number(formData.centerLng),
        },
      };
    }

    const payload = {
      organizationId,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      coordinates,
      radius: formData.type === "circle" ? Number(formData.radius) : null,
      active: formData.active,
    };

    try {
      const url = editing
        ? "/api/geofencing/geofences"
        : "/api/geofencing/geofences";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save geofence");
      }

      setShowForm(false);
      setEditing(null);
      setFormData({
        name: "",
        description: "",
        type: "circle",
        centerLat: "",
        centerLng: "",
        radius: "",
        active: true,
      });
      fetchGeofences();
    } catch (error) {
      console.error("Failed to save geofence:", error);
      alert("Failed to save geofence");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this geofence?")) return;

    try {
      const response = await fetch(
        `/api/geofencing/geofences?id=${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete geofence");
      }

      fetchGeofences();
    } catch (error) {
      console.error("Failed to delete geofence:", error);
      alert("Failed to delete geofence");
    }
  };

  if (loading) {
    return <div className="p-4">Loading geofences...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          Geofence Management
        </h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Geofence
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing ? "Edit Geofence" : "Create New Geofence"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="circle">Circle</option>
                  <option value="polygon">Polygon</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </div>

              {formData.type === "circle" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="centerLat">Center Latitude</Label>
                      <Input
                        id="centerLat"
                        type="number"
                        step="any"
                        value={formData.centerLat}
                        onChange={(e) =>
                          setFormData({ ...formData, centerLat: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="centerLng">Center Longitude</Label>
                      <Input
                        id="centerLng"
                        type="number"
                        step="any"
                        value={formData.centerLng}
                        onChange={(e) =>
                          setFormData({ ...formData, centerLng: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={formData.radius}
                      onChange={(e) =>
                        setFormData({ ...formData, radius: e.target.value })
                      }
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editing ? "Update" : "Create"} Geofence
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {geofences.map((geofence) => (
          <Card key={geofence.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2">
                  {geofence.active ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                  {geofence.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(geofence);
                      setFormData({
                        name: geofence.name,
                        description: "",
                        type: geofence.type,
                        centerLat:
                          geofence.coordinates?.center?.lat?.toString() || "",
                        centerLng:
                          geofence.coordinates?.center?.lng?.toString() || "",
                        radius: geofence.radius?.toString() || "",
                        active: geofence.active,
                      });
                      setShowForm(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(geofence.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Type:</strong> {geofence.type}
                </p>
                {geofence.type === "circle" && geofence.radius && (
                  <p>
                    <strong>Radius:</strong> {geofence.radius}m
                  </p>
                )}
                <p>
                  <strong>Status:</strong>{" "}
                  {geofence.active ? "Active" : "Inactive"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {geofences.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No geofences defined. Create your first geofence to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
