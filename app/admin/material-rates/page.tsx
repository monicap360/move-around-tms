"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MaterialRate = {
  id: string;
  material_name: string;
  material_code?: string;
  default_bill_rate: number;
  default_pay_rate: number;
  unit_type: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function MaterialRatesPage() {
  const [rates, setRates] = useState<MaterialRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<MaterialRate>>({
    material_name: '',
    material_code: '',
    default_bill_rate: 0,
    default_pay_rate: 0,
    unit_type: 'Load',
    description: '',
    active: true,
  });

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    setLoading(true);
    const res = await fetch('/api/admin/material-rates', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}` },
    });
    const json = await res.json();
    if (json.data) setRates(json.data);
    setLoading(false);
  }

  async function handleSave() {
    const method = editing ? 'PATCH' : 'POST';
    const body = editing ? { id: editing, ...formData } : formData;

    const res = await fetch('/api/admin/material-rates', {
      method,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchRates();
      setShowForm(false);
      setEditing(null);
      setFormData({
        material_name: '',
        material_code: '',
        default_bill_rate: 0,
        default_pay_rate: 0,
        unit_type: 'Load',
        description: '',
        active: true,
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this material rate?')) return;
    const res = await fetch(`/api/admin/material-rates?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}` },
    });
    if (res.ok) await fetchRates();
  }

  function handleEdit(rate: MaterialRate) {
    setEditing(rate.id);
    setFormData(rate);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Material Rates</h1>
          <p className="text-sm text-gray-600 mt-1">Manage aggregate material types and default pricing</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); }}>
          + Add Material
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit' : 'Add'} Material Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Material Name *</label>
                <input
                  type="text"
                  value={formData.material_name || ''}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Material Code</label>
                <input
                  type="text"
                  value={formData.material_code || ''}
                  onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., LIME, GRAVEL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Bill Rate *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_bill_rate || 0}
                  onChange={(e) => setFormData({ ...formData, default_bill_rate: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Pay Rate *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_pay_rate || 0}
                  onChange={(e) => setFormData({ ...formData, default_pay_rate: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Type</label>
                <select
                  value={formData.unit_type || 'Load'}
                  onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Load">Load</option>
                  <option value="Yard">Yard</option>
                  <option value="Ton">Ton</option>
                  <option value="Hour">Hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Active</label>
                <input
                  type="checkbox"
                  checked={formData.active ?? true}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="mt-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Material</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Bill Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pay Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Margin</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => {
                  const margin = rate.default_bill_rate - rate.default_pay_rate;
                  const marginPct = rate.default_bill_rate > 0
                    ? ((margin / rate.default_bill_rate) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={rate.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rate.material_name}</div>
                        {rate.description && (
                          <div className="text-xs text-gray-500">{rate.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{rate.material_code || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">${rate.default_bill_rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-mono">${rate.default_pay_rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{rate.unit_type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-green-700">${margin.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 ml-1">({marginPct}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            rate.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rate.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(rate)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(rate.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
