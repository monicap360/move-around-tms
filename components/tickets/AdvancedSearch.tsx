"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Save } from "lucide-react";

interface SearchCriteria {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "between";
  value: string;
  value2?: string; // For "between" operator
}

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria[]) => void;
  onSaveSearch?: (name: string, criteria: SearchCriteria[]) => void;
  savedSearches?: Array<{ id: string; name: string; criteria: SearchCriteria[] }>;
}

const SEARCH_FIELDS = [
  { id: "ticket_number", label: "Ticket Number" },
  { id: "driver_name", label: "Driver Name" },
  { id: "customer_name", label: "Customer Name" },
  { id: "material_type", label: "Material Type" },
  { id: "quantity", label: "Quantity" },
  { id: "total_amount", label: "Total Amount" },
  { id: "status", label: "Status" },
  { id: "ticket_date", label: "Date" },
];

const OPERATORS = [
  { id: "equals", label: "Equals" },
  { id: "contains", label: "Contains" },
  { id: "greater_than", label: "Greater Than" },
  { id: "less_than", label: "Less Than" },
  { id: "between", label: "Between" },
];

export default function AdvancedSearch({
  onSearch,
  onSaveSearch,
  savedSearches = [],
}: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  function addCriterion() {
    setCriteria([
      ...criteria,
      {
        field: SEARCH_FIELDS[0].id,
        operator: "equals",
        value: "",
      },
    ]);
  }

  function removeCriterion(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  function updateCriterion(index: number, updates: Partial<SearchCriteria>) {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setCriteria(newCriteria);
  }

  function handleSearch() {
    const validCriteria = criteria.filter((c) => c.value.trim() !== "");
    onSearch(validCriteria);
  }

  function handleSave() {
    if (saveName.trim() && onSaveSearch) {
      onSaveSearch(saveName.trim(), criteria);
      setShowSaveDialog(false);
      setSaveName("");
    }
  }

  function loadSavedSearch(savedCriteria: SearchCriteria[]) {
    setCriteria(savedCriteria);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Advanced Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Saved Searches</p>
            <div className="space-y-1">
              {savedSearches.map((saved) => (
                <Button
                  key={saved.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => loadSavedSearch(saved.criteria)}
                >
                  {saved.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search Criteria */}
        <div className="space-y-3">
          {criteria.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No search criteria. Click "Add Criteria" to start.
            </p>
          )}

          {criteria.map((criterion, index) => (
            <div key={index} className="flex gap-2 items-start p-3 border rounded">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <select
                  value={criterion.field}
                  onChange={(e) =>
                    updateCriterion(index, { field: e.target.value })
                  }
                  className="px-2 py-1 border rounded text-sm"
                >
                  {SEARCH_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <select
                  value={criterion.operator}
                  onChange={(e) =>
                    updateCriterion(index, {
                      operator: e.target.value as SearchCriteria["operator"],
                    })
                  }
                  className="px-2 py-1 border rounded text-sm"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    value={criterion.value}
                    onChange={(e) =>
                      updateCriterion(index, { value: e.target.value })
                    }
                    placeholder="Value"
                    className="text-sm"
                  />
                  {criterion.operator === "between" && (
                    <Input
                      value={criterion.value2 || ""}
                      onChange={(e) =>
                        updateCriterion(index, { value2: e.target.value })
                      }
                      placeholder="To"
                      className="text-sm"
                    />
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeCriterion(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={addCriterion} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Criteria
          </Button>
          <Button onClick={handleSearch} className="flex-1 gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
          {onSaveSearch && criteria.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-3 border rounded bg-gray-50">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Search name"
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
