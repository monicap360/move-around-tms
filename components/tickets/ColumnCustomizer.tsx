"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

interface ColumnOption {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnCustomizerProps {
  columns: ColumnOption[];
  visibleColumns: string[];
  onSave: (visibleColumns: string[]) => void;
  userId?: string;
}

export default function ColumnCustomizer({
  columns,
  visibleColumns,
  onSave,
  userId,
}: ColumnCustomizerProps) {
  const [localVisibleColumns, setLocalVisibleColumns] = useState(visibleColumns);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!userId) {
      alert("Please log in to save column preferences");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/tickets/column-customization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          visible_columns: localVisibleColumns,
        }),
      });

      if (res.ok) {
        onSave(localVisibleColumns);
        alert("Column preferences saved");
      } else {
        alert("Failed to save preferences");
      }
    } catch (err) {
      console.error("Error saving column customization:", err);
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function toggleColumn(columnId: string) {
    if (localVisibleColumns.includes(columnId)) {
      setLocalVisibleColumns(localVisibleColumns.filter((id) => id !== columnId));
    } else {
      setLocalVisibleColumns([...localVisibleColumns, columnId]);
    }
  }

  function moveColumn(columnId: string, direction: "up" | "down") {
    const index = localVisibleColumns.indexOf(columnId);
    if (index === -1) return;

    const newColumns = [...localVisibleColumns];
    if (direction === "up" && index > 0) {
      [newColumns[index - 1], newColumns[index]] = [
        newColumns[index],
        newColumns[index - 1],
      ];
    } else if (direction === "down" && index < newColumns.length - 1) {
      [newColumns[index], newColumns[index + 1]] = [
        newColumns[index + 1],
        newColumns[index],
      ];
    }
    setLocalVisibleColumns(newColumns);
  }

  const visibleColumnOptions = columns.filter((col) =>
    localVisibleColumns.includes(col.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Customize Columns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visible Columns */}
        <div>
          <p className="text-sm font-medium mb-2">Visible Columns (drag to reorder)</p>
          <div className="space-y-2">
            {visibleColumnOptions.map((col) => (
              <div
                key={col.id}
                className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleColumn(col.id)}
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
                <span className="flex-1 text-sm">{col.label}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveColumn(col.id, "up")}
                    disabled={localVisibleColumns.indexOf(col.id) === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveColumn(col.id, "down")}
                    disabled={
                      localVisibleColumns.indexOf(col.id) ===
                      localVisibleColumns.length - 1
                    }
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Columns */}
        <div>
          <p className="text-sm font-medium mb-2">Hidden Columns</p>
          <div className="space-y-2">
            {columns
              .filter((col) => !localVisibleColumns.includes(col.id))
              .map((col) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleColumn(col.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <span className="flex-1 text-sm text-gray-500">{col.label}</span>
                </div>
              ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !userId}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Column Layout"}
        </Button>
      </CardContent>
    </Card>
  );
}
