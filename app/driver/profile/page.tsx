"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Upload,
  Calendar,
  FileText,
  AlertCircle,
  Clock as ClockIcon,
  LogIn,
  LogOut,
  Coffee,
  Truck as TruckIcon,
} from "lucide-react";
import Link from "next/link";

type Driver = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  truck_type?: string;
  truck_weight?: string;
  truck_year?: number;
  truck_make?: string;
  truck_model?: string;
};

type Ticket = {
  id: string;
  ticket_number: string;
  material: string;
  quantity: number;
  unit_type: string;
  ticket_date: string;
  status: string;
  total_pay: number;
  partner_name: string;
};

type TimeClockEntry = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  total_hours: number | null;
};

type Truck = { id: string; name: string; type?: string };
type Shift = {
  id: string;
  shift_date: string; // date string
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: "open" | "pending_approval" | "approved" | "denied";
  requested_driver_id?: string | null;
  assigned_driver_id?: string | null;
  truck_id: string;
  trucks?: { name: string } | { name: string }[] | null;
};

type Availability = {
  id?: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  standby: boolean;
};

export default function DriverProfilePage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState("");
  const [currentWeekEnd, setCurrentWeekEnd] = useState("");
  const [canUpload, setCanUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  // Time clock
  const [todayEntry, setTodayEntry] = useState<TimeClockEntry | null>(null);
  const [weekEntries, setWeekEntries] = useState<TimeClockEntry[]>([]);
  const [clockLoading, setClockLoading] = useState(false);

  // Availability (next 14 days)
  const [availability, setAvailability] = useState<
    Record<string, Availability>
  >({});
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  // Shifts
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);

  const next14Days = useMemo(() => getDateRange(14), []);

  useEffect(() => {
    const { start, end, isInPayWeek } = calculatePayWeek();
    setCurrentWeekStart(start);
    setCurrentWeekEnd(end);
    setCanUpload(isInPayWeek);
    loadDriverData(start, end);
  }, []);

  function toDateOnly(d: Date) {
    return d.toISOString().split("T")[0];
  }

  function getDateRange(days: number): string[] {
    const result: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(toDateOnly(d));
    }
    return result;
  }

  function calculatePayWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceFriday = (dayOfWeek + 2) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const start = weekStart.toISOString().split("T")[0];
    const end = weekEnd.toISOString().split("T")[0];
    const isInPayWeek = today >= weekStart && today <= weekEnd;

    return { start, end, isInPayWeek };
  }

  async function loadDriverData(weekStart?: string, weekEnd?: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserEmail(user.email || "");

      const { data: driverData, error: driverErr } = await supabase
        .from("drivers")
        .select("*")
        .eq("email", user.email)
        .single();

      if (driverErr || !driverData) {
        console.error("Driver not found for email:", user.email, driverErr);
        window.location.href = "/complete-profile";
        return;
      }

      setDriver(driverData);

      // Load time clock
      await loadTimeClockData(
        driverData.id,
        weekStart || currentWeekStart,
        weekEnd || currentWeekEnd,
      );

      // Load availability for next 14 days
      await loadAvailability(driverData.id);

      // Load shifts (open and mine)
      await loadShifts(driverData.id);

      // Tickets for current pay week
      const start = weekStart || currentWeekStart;
      const end = weekEnd || currentWeekEnd;
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from("aggregate_tickets")
        .select(
          `
          id,
          ticket_number,
          material,
          quantity,
          unit_type,
          ticket_date,
          status,
          total_pay,
          aggregate_partners (name)
        `,
        )
        .eq("driver_id", driverData.id)
        .gte("ticket_date", start)
        .lte("ticket_date", end)
        .order("ticket_date", { ascending: false });

      if (ticketsErr) {
        console.error("Error loading tickets:", ticketsErr);
      } else {
        const formattedTickets = (ticketsData || []).map((t: any) => ({
          id: t.id,
          ticket_number: t.ticket_number,
          material: t.material,
          quantity: t.quantity,
          unit_type: t.unit_type,
          ticket_date: t.ticket_date,
          status: t.status,
          total_pay: t.total_pay,
          partner_name: t.aggregate_partners?.name || "Unknown",
        }));
        setTickets(formattedTickets);
        const total = formattedTickets
          .filter((t) => t.status === "Approved")
          .reduce((sum, t) => sum + (t.total_pay || 0), 0);
        setWeekTotal(total);
      }
    } catch (err) {
      console.error("Error loading driver profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeClockData(
    driverId: string,
    weekStart: string,
    weekEnd: string,
  ) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayData } = await supabase
        .from("time_clock_entries")
        .select("*")
        .eq("driver_id", driverId)
        .gte("clock_in", `${today}T00:00:00`)
        .lte("clock_in", `${today}T23:59:59`)
        .order("clock_in", { ascending: false })
        .limit(1)
        .single();
      setTodayEntry(todayData);

      const { data: weekData } = await supabase
        .from("time_clock_entries")
        .select("*")
        .eq("driver_id", driverId)
        .gte("clock_in", `${weekStart}T00:00:00`)
        .lte("clock_in", `${weekEnd}T23:59:59`)
        .order("clock_in", { ascending: false });
      setWeekEntries(weekData || []);
    } catch (err) {
      console.error("Error loading time clock data:", err);
    }
  }

  async function handleClockIn() {
    if (!driver) return;
    setClockLoading(true);
    try {
      const { error } = await supabase
        .from("time_clock_entries")
        .insert({ driver_id: driver.id, clock_in: new Date().toISOString() });
      if (error) throw error;
      await loadTimeClockData(driver.id, currentWeekStart, currentWeekEnd);
    } catch (err: any) {
      alert("Failed to clock in: " + err.message);
    } finally {
      setClockLoading(false);
    }
  }

  async function handleClockOut() {
    if (!driver || !todayEntry) return;
    setClockLoading(true);
    try {
      const { error } = await supabase
        .from("time_clock_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", todayEntry.id);
      if (error) throw error;
      await loadTimeClockData(driver.id, currentWeekStart, currentWeekEnd);
    } catch (err: any) {
      alert("Failed to clock out: " + err.message);
    } finally {
      setClockLoading(false);
    }
  }

  async function handleLunchStart() {
    if (!driver || !todayEntry) return;
    setClockLoading(true);
    try {
      const { error } = await supabase
        .from("time_clock_entries")
        .update({ lunch_start: new Date().toISOString() })
        .eq("id", todayEntry.id);
      if (error) throw error;
      await loadTimeClockData(driver.id, currentWeekStart, currentWeekEnd);
    } catch (err: any) {
      alert("Failed to start lunch: " + err.message);
    } finally {
      setClockLoading(false);
    }
  }

  async function handleLunchEnd() {
    if (!driver || !todayEntry) return;
    setClockLoading(true);
    try {
      const { error } = await supabase
        .from("time_clock_entries")
        .update({ lunch_end: new Date().toISOString() })
        .eq("id", todayEntry.id);
      if (error) throw error;
      await loadTimeClockData(driver.id, currentWeekStart, currentWeekEnd);
    } catch (err: any) {
      alert("Failed to end lunch: " + err.message);
    } finally {
      setClockLoading(false);
    }
  }

  // Availability
  async function loadAvailability(driverId: string) {
    try {
      const start = next14Days[0];
      const end = next14Days[next14Days.length - 1];
      const { data } = await supabase
        .from("driver_availability")
        .select("*")
        .eq("driver_id", driverId)
        .gte("date", start)
        .lte("date", end);
      const map: Record<string, Availability> = {};
      next14Days.forEach((d) => {
        map[d] = {
          date: d,
          available: false,
          start_time: null,
          end_time: null,
          standby: false,
        };
      });
      (data || []).forEach((row: any) => {
        map[row.date] = {
          id: row.id,
          date: row.date,
          available: row.available,
          start_time: row.start_time ? row.start_time.slice(0, 5) : null,
          end_time: row.end_time ? row.end_time.slice(0, 5) : null,
          standby: row.standby,
        };
      });
      setAvailability(map);
    } catch (e) {
      console.error("Failed to load availability", e);
    }
  }

  function updateAvailability(date: string, update: Partial<Availability>) {
    setAvailability((prev) => ({
      ...prev,
      [date]: { ...prev[date], ...update } as Availability,
    }));
  }

  async function saveAvailability() {
    if (!driver) return;
    setAvailabilitySaving(true);
    try {
      const rows = next14Days.map((d) => {
        const a = availability[d];
        return {
          id: a.id,
          driver_id: driver.id,
          date: d,
          available: a?.available || false,
          start_time: a?.start_time ? `${a.start_time}:00` : null,
          end_time: a?.end_time ? `${a.end_time}:00` : null,
          standby: a?.standby || false,
        };
      });
      const { error } = await supabase
        .from("driver_availability")
        .upsert(rows, { onConflict: "driver_id,date" });
      if (error) throw error;
    } catch (err: any) {
      alert("Failed to save availability: " + err.message);
    } finally {
      setAvailabilitySaving(false);
    }
  }

  // Shifts
  async function loadShifts(driverId: string) {
    try {
      setShiftLoading(true);
      const start = next14Days[0];
      const end = next14Days[next14Days.length - 1];

      const { data: open } = await supabase
        .from("shifts")
        .select(
          "id, shift_date, start_time, end_time, status, requested_driver_id, assigned_driver_id, truck_id, trucks(name)",
        )
        .eq("status", "open")
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true });
      setOpenShifts(open || []);

      const { data: mine } = await supabase
        .from("shifts")
        .select(
          "id, shift_date, start_time, end_time, status, requested_driver_id, assigned_driver_id, truck_id, trucks(name)",
        )
        .or(
          `assigned_driver_id.eq.${driverId},and(status.eq.pending_approval,requested_driver_id.eq.${driverId})`,
        )
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true });
      setMyShifts(mine || []);
    } catch (e) {
      console.error("Failed to load shifts", e);
    } finally {
      setShiftLoading(false);
    }
  }

  async function requestPickup(shiftId: string) {
    if (!driver) return;
    try {
      const { error } = await supabase
        .from("shifts")
        .update({ requested_driver_id: driver.id, status: "pending_approval" })
        .eq("id", shiftId)
        .eq("status", "open");
      if (error) throw error;
      await loadShifts(driver.id);
      alert("Shift pickup requested. Awaiting manager approval.");
    } catch (err: any) {
      alert("Failed to request pickup: " + err.message);
    }
  }

  async function requestSwap(shiftId: string) {
    if (!driver) return;
    const message = prompt(
      "Optional message to manager about this swap request:",
    );
    try {
      const { error } = await supabase.from("shift_swap_requests").insert({
        shift_id: shiftId,
        from_driver_id: driver.id,
        to_driver_id: null,
        type: "swap",
        status: "pending",
        message: message || null,
      });
      if (error) throw error;
      alert("Swap request submitted. Manager approval required.");
    } catch (err: any) {
      alert("Failed to request swap: " + err.message);
    }
  }

  const totalWeekHours = weekEntries.reduce(
    (sum, e) => sum + (e.total_hours || 0),
    0,
  );

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 text-center">
            <p className="text-blue-800 mb-4">
              Redirecting to profile setup...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600">Welcome, {driver.name}</p>
        </div>
        {canUpload ? (
          <Link href="/driver/upload">
            <Button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Ticket
            </Button>
          </Link>
        ) : (
          <Button disabled className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Upload Locked
          </Button>
        )}
      </div>

      {/* Upload Status */}
      {!canUpload && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  Upload Restricted
                </p>
                <p className="text-sm text-orange-800">
                  You can only upload tickets during the current pay week
                  (Friday to Thursday). Current pay week: {currentWeekStart} to{" "}
                  {currentWeekEnd}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Truck */}
      {(driver.truck_make || driver.truck_model) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5" /> My Truck
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {driver.truck_year && (
                <div>
                  <p className="text-gray-500">Year</p>
                  <p className="font-semibold">{driver.truck_year}</p>
                </div>
              )}
              {driver.truck_make && (
                <div>
                  <p className="text-gray-500">Make</p>
                  <p className="font-semibold">{driver.truck_make}</p>
                </div>
              )}
              {driver.truck_model && (
                <div>
                  <p className="text-gray-500">Model</p>
                  <p className="font-semibold">{driver.truck_model}</p>
                </div>
              )}
              {driver.truck_weight && (
                <div>
                  <p className="text-gray-500">Weight</p>
                  <p className="font-semibold">{driver.truck_weight}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Clock and Weekly Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" /> Time Clock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleClockIn}
              disabled={
                clockLoading || (!!todayEntry && todayEntry.clock_out === null)
              }
              className="flex items-center gap-2"
              variant={
                !!todayEntry && todayEntry.clock_out === null
                  ? "outline"
                  : "default"
              }
            >
              <LogIn className="w-4 h-4" /> Clock In
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={
                clockLoading || !todayEntry || todayEntry.clock_out !== null
              }
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Clock Out
            </Button>
            <Button
              onClick={handleLunchStart}
              disabled={
                clockLoading ||
                !todayEntry ||
                todayEntry.clock_out !== null ||
                todayEntry.lunch_start !== null
              }
              className="flex items-center gap-2"
              variant="outline"
            >
              <Coffee className="w-4 h-4" /> Start Lunch
            </Button>
            <Button
              onClick={handleLunchEnd}
              disabled={
                clockLoading ||
                !todayEntry ||
                todayEntry.lunch_start === null ||
                todayEntry.lunch_end !== null
              }
              className="flex items-center gap-2"
              variant="outline"
            >
              <Coffee className="w-4 h-4" /> End Lunch
            </Button>
          </div>

          {todayEntry && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Today&apos;s Status
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-blue-700">Clock In</p>
                  <p className="font-semibold">
                    {new Date(todayEntry.clock_in).toLocaleTimeString()}
                  </p>
                </div>
                {todayEntry.clock_out && (
                  <div>
                    <p className="text-blue-700">Clock Out</p>
                    <p className="font-semibold">
                      {new Date(todayEntry.clock_out).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                {todayEntry.lunch_start && (
                  <div>
                    <p className="text-blue-700">Lunch Start</p>
                    <p className="font-semibold">
                      {new Date(todayEntry.lunch_start).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                {todayEntry.lunch_end && (
                  <div>
                    <p className="text-blue-700">Lunch End</p>
                    <p className="font-semibold">
                      {new Date(todayEntry.lunch_end).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
              {todayEntry.total_hours !== null && (
                <div className="mt-3">
                  <p className="text-blue-700 text-sm">Total Hours Today</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {todayEntry.total_hours.toFixed(2)} hrs
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Total Hours This Week</p>
            <p className="text-3xl font-bold text-green-600">
              {totalWeekHours.toFixed(2)} hrs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Availability (submit 2 weeks in advance) */}
      <Card>
        <CardHeader>
          <CardTitle>My Availability (next 2 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Available</th>
                  <th className="text-left p-3">Start</th>
                  <th className="text-left p-3">End</th>
                  <th className="text-left p-3">Standby</th>
                </tr>
              </thead>
              <tbody>
                {next14Days.map((d) => {
                  const a = availability[d] || {
                    date: d,
                    available: false,
                    start_time: null,
                    end_time: null,
                    standby: false,
                  };
                  return (
                    <tr key={d} className="border-b">
                      <td className="p-3">
                        {new Date(d).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!a.available}
                          onChange={(e) =>
                            updateAvailability(d, {
                              available: e.target.checked,
                            })
                          }
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="time"
                          className="border rounded px-2 py-1"
                          value={a.start_time || ""}
                          onChange={(e) =>
                            updateAvailability(d, {
                              start_time: e.target.value,
                            })
                          }
                          disabled={!a.available}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="time"
                          className="border rounded px-2 py-1"
                          value={a.end_time || ""}
                          onChange={(e) =>
                            updateAvailability(d, { end_time: e.target.value })
                          }
                          disabled={!a.available}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!a.standby}
                          onChange={(e) =>
                            updateAvailability(d, { standby: e.target.checked })
                          }
                          disabled={!a.available}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveAvailability} disabled={availabilitySaving}>
              {availabilitySaving ? "Saving..." : "Save Availability"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shifts by truck (pickup) */}
      <Card>
        <CardHeader>
          <CardTitle>Available Shifts by Truck (next 2 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {shiftLoading ? (
            <p className="text-gray-500">Loading shifts...</p>
          ) : openShifts.length === 0 ? (
            <p className="text-gray-500">No open shifts available.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                groupBy(
                  openShifts,
                  (s) => getTruckName(s) || "Unassigned Truck",
                ),
              ).map(([truck, items]) => (
                <div key={truck} className="border rounded">
                  <div className="px-4 py-2 font-semibold bg-gray-50 flex items-center gap-2">
                    <TruckIcon className="w-4 h-4" /> {truck}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Start</th>
                          <th className="text-left p-3">End</th>
                          <th className="text-left p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((s) => (
                          <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              {new Date(s.shift_date).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              {s.start_time.substring(0, 5)}
                            </td>
                            <td className="p-3">
                              {s.end_time.substring(0, 5)}
                            </td>
                            <td className="p-3">
                              <Button onClick={() => requestPickup(s.id)}>
                                Request Pickup
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            Note: Picking up a shift requires manager approval.
          </p>
        </CardContent>
      </Card>

      {/* My upcoming shifts */}
      <Card>
        <CardHeader>
          <CardTitle>My Upcoming Shifts (next 2 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {myShifts.length === 0 ? (
            <p className="text-gray-500">No upcoming shifts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Truck</th>
                    <th className="text-left p-3">Start</th>
                    <th className="text-left p-3">End</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myShifts.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(s.shift_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{getTruckName(s) || "—"}</td>
                      <td className="p-3">{s.start_time.substring(0, 5)}</td>
                      <td className="p-3">{s.end_time.substring(0, 5)}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {s.status === "approved" && (
                            <Button
                              variant="outline"
                              onClick={() => requestSwap(s.id)}
                            >
                              Request Swap
                            </Button>
                          )}
                          {s.status === "pending_approval" &&
                            s.requested_driver_id === driver.id && (
                              <span className="text-xs text-gray-600">
                                Pickup pending approval
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            You can swap shifts with eligible drivers. Manager approval is
            required.
          </p>
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tickets for Week: {currentWeekStart} to {currentWeekEnd}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tickets uploaded for this week yet.
              {canUpload && (
                <span>
                  {" "}
                  <Link
                    href="/driver/upload"
                    className="text-blue-600 underline"
                  >
                    Upload your first ticket
                  </Link>
                </span>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Partner</th>
                    <th className="text-left p-3">Material</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Ticket #</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(ticket.ticket_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{ticket.partner_name}</td>
                      <td className="p-3">{ticket.material}</td>
                      <td className="p-3">
                        {ticket.quantity} {ticket.unit_type}
                      </td>
                      <td className="p-3">{ticket.ticket_number}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            ticket.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : ticket.status === "Denied"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getTruckName(s: Shift): string | undefined {
  const t = s.trucks as any;
  if (!t) return undefined;
  if (Array.isArray(t)) {
    return t[0]?.name;
  }
  return t.name;
}

// Small helper to group array items by a key selector
function groupBy<T>(
  arr: T[],
  keySelector: (t: T) => string,
): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = keySelector(item);
      acc[k] = acc[k] || [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}
