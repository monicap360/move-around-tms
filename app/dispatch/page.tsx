"use client";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function DispatchPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      padding: 0,
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Dispatch</h1>
      <p style={{ fontSize: 20, color: '#475569', marginBottom: 32 }}>
        Assign and track loads in real time. Manage pickup and drop-off scheduling and route optimization.
      </p>
      <div style={{
        background: '#e0e7ef',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(30,41,59,0.08)',
        padding: 32,
        minWidth: 340,
        minHeight: 180,
        width: '100%',
        maxWidth: 800,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 18, color: '#2563eb', marginBottom: 12 }}>
          Coming soon: map view, load boards, and dispatcher-to-driver chat.
        </div>
        <button
          style={{
            background: '#2563eb',
            color: 'white',
            borderRadius: 8,
            padding: 12,
            fontWeight: 600,
            fontSize: 18,
            border: 'none',
            cursor: 'pointer',
            marginTop: 10,
          }}
          onClick={async () => {
            try {
              // Example: suggest a reassignment for Lilia G.
              const res = await fetch('/api/reassign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverName: 'Lilia G.' }),
              })
              const data = await res.json()
              if (data.ok) {
                alert(`Suggested truck: ${data.suggestedTruck.unit} (type: ${data.suggestedTruck.truck_type})`)
              } else {
                alert(`No suggestion: ${data.message}`)
              }
            } catch (err) {
              alert('Error while requesting suggestion: ' + String(err))
            }
          }}
        >
          Suggest Truck
        </button>
      </div>
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  );
}
