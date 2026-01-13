"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Package, Loader } from "lucide-react";

interface EvidencePacketGeneratorProps {
  ticketId: string;
  ticketNumber?: string;
}

export default function EvidencePacketGenerator({
  ticketId,
  ticketNumber,
}: EvidencePacketGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [packet, setPacket] = useState<any>(null);

  async function handleGenerate() {
    try {
      setGenerating(true);
      const res = await fetch(`/api/tickets/${ticketId}/evidence-packet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: null }), // Would get from auth context
      });

      if (res.ok) {
        const data = await res.json();
        setPacket(data.packet);
      } else {
        alert("Failed to generate evidence packet");
      }
    } catch (err) {
      console.error("Error generating evidence packet:", err);
      alert("Failed to generate evidence packet");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Evidence Packet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!packet ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Generate a comprehensive evidence packet for this ticket including
              all related tickets, confidence scores, anomalies, and a narrative
              summary.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Evidence Packet
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium mb-2">Packet Generated</p>
              <p className="text-xs text-gray-600">
                {new Date(packet.generated_at).toLocaleString()}
              </p>
            </div>

            {packet.narrative_summary && (
              <div>
                <p className="text-sm font-medium mb-2">Summary</p>
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-48 overflow-y-auto">
                  {packet.narrative_summary}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  // Download PDF (would implement PDF generation)
                  alert("PDF download - implement PDF generation service");
                }}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  // Download ZIP (would implement ZIP generation)
                  alert("ZIP download - implement ZIP generation service");
                }}
              >
                <Package className="w-4 h-4" />
                Download ZIP
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
