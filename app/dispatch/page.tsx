"use client";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function DispatchPage() {
  return (
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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
    }}>
      <div style={{ fontSize: 18, color: '#2563eb', marginBottom: 12 }}>
        Dispatch Center: Access all dispatch tools below.
      </div>
      <a href="/dispatch/board" style={{
        display: 'block',
        background: '#2563eb',
        color: 'white',
        borderRadius: 8,
        padding: '12px 32px',
        fontWeight: 600,
        fontSize: 18,
        textDecoration: 'none',
        marginBottom: 8,
      }}>Open Dispatch Board</a>
      <a href="/dispatch/map" style={{
        display: 'block',
        background: '#0ea5e9',
        color: 'white',
        borderRadius: 8,
        padding: '12px 32px',
        fontWeight: 600,
        fontSize: 18,
        textDecoration: 'none',
        marginBottom: 8,
      }}>Live Fleet Map</a>
      <a href="/dispatch/loads/L-1001" style={{
        display: 'block',
        background: '#22c55e',
        color: 'white',
        borderRadius: 8,
        padding: '12px 32px',
        fontWeight: 600,
        fontSize: 18,
        textDecoration: 'none',
      }}>View Load Details</a>

      <div style={{ marginTop: 24 }}>
        <Button
          onClick={async () => {
            try {
              // Example API call for truck suggestion
              const response = await fetch('/api/dispatch/suggest-truck', { method: 'POST' });
              const data = await response.json();
              if (data.ok) {
                alert(`Suggested truck: ${data.suggestedTruck.unit} (type: ${data.suggestedTruck.truck_type})`);
              } else {
                alert(`No suggestion: ${data.message}`);
              }
            } catch (err) {
              alert('Error while requesting suggestion: ' + String(err));
            }
          }}
        >
          Suggest Truck
        </Button>
      </div>
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  );
}
