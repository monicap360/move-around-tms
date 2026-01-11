"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "../../components/ui/card";

function countDefects(dvirs) {
  let total = 0;
  let byItem = {};
  dvirs.forEach((d) => {
    (d.inspection_items || []).forEach((i) => {
      if (i.status === "defective") {
        total++;
        byItem[i.item] = (byItem[i.item] || 0) + 1;
      }
    });
  });
  return { total, byItem };
}

function getUniqueTrucks(dvirs) {
  return Array.from(new Set(dvirs.map((d) => d.truck_number)));
}

export default function DVIRAnalytics({ dvirs }) {
  if (!dvirs || dvirs.length === 0) return null;
  const { total, byItem } = countDefects(dvirs);
  const trucks = getUniqueTrucks(dvirs) as string[];
  const defectiveDVIRs = dvirs.filter((d) => d.overall_status === "defective");
  const complianceRate = (
    ((dvirs.length - defectiveDVIRs.length) / dvirs.length) *
    100
  ).toFixed(1);
  const mostDefective: [string, number][] = Object.entries(byItem)
    .map(([item, count]) => [String(item), Number(count)] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const overdueRepairs = dvirs.filter(
    (d) => d.overall_status === "defective" && !d.mechanic_signature,
  );
  const repeatDefects: string[] = trucks.filter((truck) => {
    const truckDVIRs = dvirs.filter((d) => d.truck_number === truck);
    return (
      truckDVIRs.filter((d) => d.overall_status === "defective").length >= 3
    );
  });

  return (
    <div className="mb-8">
      <Card className="border border-blue-300 bg-blue-50">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle>DVIR Analytics & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div>
            <div className="text-3xl font-bold">{complianceRate}%</div>
            <div className="text-gray-700">Compliance Rate</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-gray-700">Total Defects Reported</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{overdueRepairs.length}</div>
            <div className="text-gray-700">Overdue Repairs</div>
          </div>
          <div className="md:col-span-3 mt-4">
            <div className="font-semibold mb-1">Most Common Defects:</div>
            <ul className="list-disc ml-6 text-sm">
              {mostDefective.map(([item, count]: [string, number]) => (
                <li key={item}>
                  {item.replace(/_/g, " ")}: {count}
                </li>
              ))}
              {mostDefective.length === 0 && <li>No defects reported</li>}
            </ul>
          </div>
          <div className="md:col-span-3 mt-4">
            <div className="font-semibold mb-1">
              Trucks with Repeat Defects:
            </div>
            <ul className="list-disc ml-6 text-sm">
              {repeatDefects.map((truck: string) => (
                <li key={truck}>{truck}</li>
              ))}
              {repeatDefects.length === 0 && <li>None</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
