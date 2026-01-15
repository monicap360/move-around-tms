"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DetentionEvent {
  id: string;
  facility_name: string;
  arrived_at: string;
  departed_at?: string | null;
  total_minutes?: number | null;
  status: string;
  source: string;
  load_reference?: string | null;
}

interface DetentionClaim {
  id: string;
  load_reference?: string | null;
  status: string;
  claimed_minutes: number;
  claim_amount: number;
  currency: string;
  created_at: string;
}

export default function DetentionPage() {
  const [events, setEvents] = useState<DetentionEvent[]>([]);
  const [claims, setClaims] = useState<DetentionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(true);
  const [eventForm, setEventForm] = useState({
    facility_name: "",
    load_reference: "",
    arrived_at: "",
    departed_at: "",
    create_claim: true,
  });
  const [claimForm, setClaimForm] = useState({
    load_reference: "",
    claimed_minutes: "",
    rate_per_hour: "75",
    free_minutes: "60",
  });
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadEvents();
    loadClaims();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/detention/events", { cache: "no-store" });
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load detention events", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadClaims() {
    setClaimLoading(true);
    try {
      const res = await fetch("/api/detention/claims", { cache: "no-store" });
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (error) {
      console.error("Failed to load detention claims", error);
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleCreateEvent() {
    if (!eventForm.facility_name || !eventForm.arrived_at) return;
    try {
      const res = await fetch("/api/detention/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_name: eventForm.facility_name,
          load_reference: eventForm.load_reference || null,
          arrived_at: eventForm.arrived_at,
          departed_at: eventForm.departed_at || null,
          create_claim: eventForm.create_claim && Boolean(eventForm.departed_at),
          source: "manual",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }
      setEventForm({
        facility_name: "",
        load_reference: "",
        arrived_at: "",
        departed_at: "",
        create_claim: true,
      });
      await loadEvents();
      await loadClaims();
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleCreateClaim() {
    if (!claimForm.claimed_minutes) return;
    const claimedMinutes = Number(claimForm.claimed_minutes || 0);
    const ratePerHour = Number(claimForm.rate_per_hour || 75);
    const freeMinutes = Number(claimForm.free_minutes || 0);
    const billableMinutes = Math.max(claimedMinutes - freeMinutes, 0);
    const claimAmount = Math.round(((billableMinutes / 60) * ratePerHour) * 100) / 100;

    try {
      const res = await fetch("/api/detention/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          load_reference: claimForm.load_reference || null,
          claimed_minutes: billableMinutes,
          rate_per_hour: ratePerHour,
          free_minutes: freeMinutes,
          claim_amount: claimAmount,
          currency: "USD",
          status: "draft",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create claim");
      }
      setClaimForm({
        load_reference: "",
        claimed_minutes: "",
        rate_per_hour: "75",
        free_minutes: "60",
      });
      await loadClaims();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Detention & Accessorials
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Capture detention time, generate claims, and keep revenue from leaking.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Changes are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Log Detention Event
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Facility Name"
              value={eventForm.facility_name}
              onChange={(e) =>
                setEventForm({ ...eventForm, facility_name: e.target.value })
              }
            />
            <Input
              placeholder="Load Reference"
              value={eventForm.load_reference}
              onChange={(e) =>
                setEventForm({ ...eventForm, load_reference: e.target.value })
              }
            />
            <Input
              type="datetime-local"
              value={eventForm.arrived_at}
              onChange={(e) =>
                setEventForm({ ...eventForm, arrived_at: e.target.value })
              }
            />
            <Input
              type="datetime-local"
              value={eventForm.departed_at}
              onChange={(e) =>
                setEventForm({ ...eventForm, departed_at: e.target.value })
              }
            />
            <div className="md:col-span-2 flex items-center gap-3">
              <label className="text-sm text-text-secondary flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventForm.create_claim}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, create_claim: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                Auto-generate claim on close
              </label>
              <Button onClick={handleCreateEvent} disabled={demoMode}>
                Create Event
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Manual Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Load Reference"
              value={claimForm.load_reference}
              onChange={(e) =>
                setClaimForm({ ...claimForm, load_reference: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Total Detention Minutes"
              value={claimForm.claimed_minutes}
              onChange={(e) =>
                setClaimForm({ ...claimForm, claimed_minutes: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Rate per Hour"
              value={claimForm.rate_per_hour}
              onChange={(e) =>
                setClaimForm({ ...claimForm, rate_per_hour: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Free Minutes"
              value={claimForm.free_minutes}
              onChange={(e) =>
                setClaimForm({ ...claimForm, free_minutes: e.target.value })
              }
            />
            <div className="md:col-span-2">
              <Button onClick={handleCreateClaim} disabled={demoMode}>
                Create Claim
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Detention Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : events.length === 0 ? (
              <div className="text-text-secondary">No detention events yet.</div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">
                        {event.facility_name}
                      </div>
                      <div className="text-text-secondary text-xs">
                        Load: {event.load_reference || "N/A"} • Source: {event.source}
                      </div>
                      <div className="text-text-secondary text-xs">
                        Arrived: {new Date(event.arrived_at).toLocaleString()}
                      </div>
                      {event.departed_at && (
                        <div className="text-text-secondary text-xs">
                          Departed: {new Date(event.departed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {event.total_minutes ? `${event.total_minutes} min` : "Open"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Detention Claims
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {claimLoading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : claims.length === 0 ? (
              <div className="text-text-secondary">No claims generated yet.</div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">
                        Load {claim.load_reference || "N/A"}
                      </div>
                      <div className="text-text-secondary text-xs">
                        {claim.claimed_minutes} min • {claim.currency}{" "}
                        {claim.claim_amount.toFixed(2)}
                      </div>
                      <div className="text-text-secondary text-xs">
                        Status: {claim.status}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
