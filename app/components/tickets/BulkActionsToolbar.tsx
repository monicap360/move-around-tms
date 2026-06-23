"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  FileText,
  Download,
  X,
  AlertCircle,
  GitCompare,
} from "lucide-react";
import { useState } from "react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onBulkAction: (action: string, params?: any) => void;
  onClearSelection: () => void;
  onCompare?: () => void;
}

export default function BulkActionsToolbar({
  selectedCount,
  onBulkAction,
  onClearSelection,
  onCompare,
}: BulkActionsToolbarProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleAction(action: string, params?: any) {
    setActionLoading(action);
    try {
      await onBulkAction(action, params);
    } finally {
      setActionLoading(null);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} ticket{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="border-l border-gray-300 h-6" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("approve")}
          disabled={!!actionLoading}
          className="gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("reject")}
          disabled={!!actionLoading}
          className="gap-2"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("invoice")}
          disabled={!!actionLoading}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Mark Invoiced
        </Button>

        <div className="border-l border-gray-300 h-6" />

        {onCompare && selectedCount >= 2 && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onCompare}
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({selectedCount})
            </Button>
            <div className="border-l border-gray-300 h-6" />
          </>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("export")}
          disabled={!!actionLoading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>

        <div className="border-l border-gray-300 h-6" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
