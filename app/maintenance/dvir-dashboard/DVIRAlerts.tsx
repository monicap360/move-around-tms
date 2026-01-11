"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";

export default function DVIRAlerts({ dvirs }) {
  // Overdue repairs: defective, not corrected
  const overdue = dvirs.filter(d => d.overall_status === "defective" && !d.mechanic_signature);
  // Repeat defects: 3+ defective DVIRs for same truck
  const truckDefectCounts = {};
  dvirs.forEach(d => {
    if (d.overall_status === "defective") {
      truckDefectCounts[d.truck_number] = (truckDefectCounts[d.truck_number] || 0) + 1;
    }
  });
  const repeatTrucks = Object.entries(truckDefectCounts)
    .filter(([_, count]) => (count as number) >= 3)
    .map(([truck]) => truck);
  // At-risk: any truck with both overdue and repeat
  const atRisk = overdue.filter(d => repeatTrucks.includes(d.truck_number));


  // Mark as resolved (local only for now)
  const [resolved, setResolved] = useState([]);
  const markResolved = (id) => setResolved(r => [...r, id]);

  // Business logic: queue notifications for new unresolved alerts
  useEffect(() => {
    // Only run client-side, and only for new alerts
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@ronyxlogistics.com';
    const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || '+15555555555';
    const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USERID || 'admin';
    const queueNotification = async (alert_type, truck_number, dvir_id, message) => {
      // Email
      await fetch('/api/compliance-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type,
          truck_number,
          dvir_id,
          message,
          recipient_email: adminEmail
        })
      });
      // SMS
      await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminPhone,
          message
        })
      });
      // Push (stub)
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUserId,
          title: `Compliance Alert: ${alert_type.replace(/_/g, ' ').toUpperCase()}`,
          message
        })
      });
    };
    // Overdue
    overdue.filter(d=>!resolved.includes(d.id)).forEach(d => {
      queueNotification(
        'overdue',
        d.truck_number,
        d.id,
        `Truck ${d.truck_number} (DVIR #${d.id}) is overdue for repair since ${d.date || d.created_at}.`
      );
    });
    // Repeat defects
    repeatTrucks.forEach(truck => {
      if (!atRisk.some(d=>d.truck_number===truck && resolved.includes(d.id))) {
        queueNotification(
          'repeat_defect',
          truck,
          null,
          `Truck ${truck} has 3+ recent defective DVIRs.`
        );
      }
    });
    // At-risk
    atRisk.filter(d=>!resolved.includes(d.id)).forEach(d => {
      queueNotification(
        'at_risk',
        d.truck_number,
        d.id,
        `Truck ${d.truck_number} is overdue for repair and has repeat defects.`
      );
    });
    // Only queue once per render
    // eslint-disable-next-line
  }, [overdue, repeatTrucks, atRisk, resolved]);

  if (overdue.length === 0 && repeatTrucks.length === 0) return null;

  return (
    <div className="mb-8">
      <Card className="border border-red-400 bg-red-50">
        <CardHeader className="bg-red-600 text-white rounded-t-lg">
          <CardTitle>Compliance Alerts</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {overdue.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold mb-1">Overdue Repairs:</div>
              <ul className="list-disc ml-6 text-sm">
                {overdue.filter(d=>!resolved.includes(d.id)).map(d => (
                  <li key={d.id} className="mb-1 flex items-center justify-between">
                    <span>
                      Truck <b>{d.truck_number}</b> (DVIR #{d.id}) - Defective since {d.date || d.created_at}
                    </span>
                    <button onClick={()=>markResolved(d.id)} className="ml-4 px-2 py-1 text-xs bg-green-600 text-white rounded">Mark Resolved</button>
                  </li>
                ))}
                {overdue.filter(d=>!resolved.includes(d.id)).length===0 && <li>All overdue repairs resolved.</li>}
              </ul>
            </div>
          )}
          {repeatTrucks.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold mb-1">Repeat Defect Vehicles:</div>
              <ul className="list-disc ml-6 text-sm">
                {repeatTrucks.filter(truck=>!atRisk.some(d=>d.truck_number===truck && resolved.includes(d.id))).map(truck => (
                  <li key={truck}>
                    Truck <b>{truck}</b> has 3+ recent defective DVIRs
                  </li>
                ))}
                {repeatTrucks.filter(truck=>!atRisk.some(d=>d.truck_number===truck && resolved.includes(d.id))).length===0 && <li>All repeat defect vehicles resolved.</li>}
              </ul>
            </div>
          )}
          {atRisk.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold mb-1">At-Risk Vehicles:</div>
              <ul className="list-disc ml-6 text-sm">
                {atRisk.filter(d=>!resolved.includes(d.id)).map(d => (
                  <li key={d.id}>
                    Truck <b>{d.truck_number}</b> is overdue for repair and has repeat defects.
                  </li>
                ))}
                {atRisk.filter(d=>!resolved.includes(d.id)).length===0 && <li>All at-risk vehicles resolved.</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
