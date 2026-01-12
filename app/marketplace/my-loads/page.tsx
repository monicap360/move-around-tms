"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const supabase = createClient();
const ContractModal = dynamic(() => import('../../contracts/ContractModal'), { ssr: false });

// Simulate user context (replace with real auth/user context in production)
const mockUser = { id: 'demo-user-uuid', role: 'shipper' };

export default function MarketplaceMyLoads() {
  const [myLoads, setMyLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contractModal, setContractModal] = useState<{ open: boolean; contract: any } | null>(null);

  useEffect(() => {
    async function fetchLoads() {
      setLoading(true);
      let query = supabase.from('loads').select('*').order('created_at', { ascending: false });
      if (mockUser.role === 'shipper') {
        query = query.eq('created_by', mockUser.id);
      } else if (mockUser.role === 'hauler') {
        query = query.eq('assigned_to', mockUser.id);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) setError(fetchError.message);
      setMyLoads(data || []);
      setLoading(false);
    }
    fetchLoads();
  }, []);

  // Contract logic for loads
  async function handleSignContract(loadId: string) {
    // Mark contract as signed in Supabase and log
    await supabase.from('load_contracts').upsert([
      { load_id: loadId, signed: true, signed_at: new Date().toISOString(), user_id: mockUser.id }
    ]);
    await supabase.from('contract_audit').insert([
      { action: 'sign_contract', reason: 'Load contract signed', load_id: loadId, user_id: mockUser.id, timestamp: new Date().toISOString() }
    ]);
    setContractModal(null);
    // Refresh loads
    setLoading(true);
    let query = supabase.from('loads').select('*').order('created_at', { ascending: false });
    if (mockUser.role === 'shipper') {
      query = query.eq('created_by', mockUser.id);
    } else if (mockUser.role === 'hauler') {
      query = query.eq('assigned_to', mockUser.id);
    }
    const { data } = await query;
    setMyLoads(data || []);
    setLoading(false);
  }

  async function handleCancel(loadId: string) {
    await supabase.from('loads').update({ status: 'cancelled' }).eq('id', loadId);
    setMyLoads(myLoads.filter((load: any) => load.id !== loadId));
  }

  async function handleComplete(loadId: string) {
    await supabase.from('loads').update({ status: 'completed' }).eq('id', loadId);
    setMyLoads(myLoads.map((load: any) => load.id === loadId ? { ...load, status: 'completed' } : load));
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">My Loads</h1>
      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Origin</th>
              <th className="border p-2">Destination</th>
              <th className="border p-2">Weight</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {myLoads.map((load: any) => (
              <tr key={load.id}>
                <td className="border p-2">{load.origin || load.plant}</td>
                <td className="border p-2">{load.destination || load.yard_id}</td>
                <td className="border p-2">{load.weight || load.material}</td>
                <td className="border p-2">{load.status}</td>
                <td className="border p-2 flex gap-2">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded">View</button>
                  {['open','assigned'].includes(load.status) && (
                    <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleCancel(load.id)}>Cancel</button>
                  )}
                  {mockUser.role === 'hauler' && load.status === 'assigned' && (
                    <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleComplete(load.id)}>Complete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ContractModal
        open={!!contractModal?.open}
        onClose={() => setContractModal(null)}
        contract={contractModal?.contract || null}
        onSign={handleSignContract}
      />
    </main>
  );
}
