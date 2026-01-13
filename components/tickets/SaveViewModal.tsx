"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface SaveViewModalProps {
  currentFilters: Record<string, any>;
  onClose: () => void;
  onSave: (view: { name: string; description?: string; is_shared: boolean }) => void;
  userId?: string;
  organizationId?: string;
}

export default function SaveViewModal({
  currentFilters,
  onClose,
  onSave,
  userId,
  organizationId,
}: SaveViewModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !userId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/tickets/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          organization_id: organizationId,
          name: name.trim(),
          description: description.trim() || null,
          is_shared: isShared,
          filters: currentFilters,
        }),
      });

      if (res.ok) {
        onSave({ name: name.trim(), description: description.trim(), is_shared: isShared });
        onClose();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to save view"}`);
      }
    } catch (err) {
      console.error("Error saving view:", err);
      alert("Failed to save view");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Save Current View</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              View Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Pending Tickets"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this view"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isShared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isShared" className="text-sm">
              Share with organization
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving..." : "Save View"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
