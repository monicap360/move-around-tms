"use client";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function DispatchPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Dispatch Center</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>
            Assign and track loads in real time. Manage pickup and drop-off
            scheduling and route optimization.
          </p>
          <p className="text-sm text-gray-500">
            Coming soon: map view, load boards, and dispatcher-to-driver chat.
          </p>

          <div className="mt-4">
            <Button
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
              Suggest Reassignment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
