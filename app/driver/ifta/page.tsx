"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DriverIftaLogsPage() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startMiles, setStartMiles] = useState<string>("");
  const [endMiles, setEndMiles] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('drivers').select('id').eq('email', user.email).single();
      if (data?.id) setDriverId(data.id);
    })();
  }, []);

  function getSignatureDataUrl() {
    const canvas = canvasRef.current; if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }

  function clearSignature() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) { setDrawing(true); draw(e); }
  function endDraw() { setDrawing(false); }
  function draw(e: any) {
    if (!drawing) return; const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
  }

  async function save() {
    if (!driverId) { alert('No driver account found.'); return; }
    if (!startMiles || !endMiles) { alert('Enter start and end miles'); return; }
    const signature = getSignatureDataUrl();
    setSaving(true);
    try {
      const { error } = await supabase.from('ifta_mileage_logs').upsert({
        driver_id: driverId,
        log_date: date,
        start_miles: Number(startMiles),
        end_miles: Number(endMiles),
        signature_data: signature,
        notes,
      }, { onConflict: 'driver_id,log_date' });
      if (error) throw error;
      alert('Saved mileage log');
    } catch(e:any) {
      alert('Failed to save: ' + e.message);
    } finally { setSaving(false); }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">IFTA — Driver Mileage Log</h1>
        <p className="text-gray-600 text-sm">Enter start/end miles for your day and sign below.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Daily Mileage</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <label className="text-sm">Date<input type="date" className="w-full border p-2 rounded" value={date} onChange={(e)=>setDate(e.target.value)} /></label>
            <label className="text-sm">Start Miles<input type="number" className="w-full border p-2 rounded" value={startMiles} onChange={(e)=>setStartMiles(e.target.value)} /></label>
            <label className="text-sm">End Miles<input type="number" className="w-full border p-2 rounded" value={endMiles} onChange={(e)=>setEndMiles(e.target.value)} /></label>
            <div className="text-sm">Total
              <div className="w-full border p-2 rounded bg-gray-50">{(Number(endMiles||0) - Number(startMiles||0)).toFixed(1)}</div>
            </div>
          </div>
          <label className="text-sm block">Notes<textarea className="w-full border p-2 rounded" rows={2} value={notes} onChange={(e)=>setNotes(e.target.value)} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Driver Signature</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="border rounded">
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full bg-white"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearSignature}>Clear</Button>
            <Button onClick={save} disabled={saving || !driverId}>{saving ? 'Saving…' : 'Save Log'}</Button>
          </div>
          <p className="text-xs text-gray-600">By saving, you attest that the entered start and end miles are accurate.</p>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-600">Need to upload CSVs? Go to Admin → IFTA.</p>
    </main>
  );
}
