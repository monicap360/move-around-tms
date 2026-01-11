import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Simulate user context (replace with real auth/user context in production)
const mockUser = { id: 'demo-user-uuid', role: 'shipper' };

export default function MarketplaceMyLoads() {
  const [myLoads, setMyLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMyLoads() {
      setLoading(true);
      setError('');
      // Fetch loads where user is shipper (posted) or hauler (assigned)
      let query = supabase.from('loads').select('*').order('created_at', { ascending: false });
      if (mockUser.role === 'shipper') {
        query = query.eq('created_by', mockUser.id);
      } else if (mockUser.role === 'hauler') {
        query = query.eq('assigned_to', mockUser.id);
      }
      const { data, error } = await query;
      if (error) setError(error.message);
      setMyLoads(data || []);
      setLoading(false);
    }
    fetchMyLoads();
    const interval = setInterval(fetchMyLoads, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleCancel(loadId: string) {
    setLoading(true);
    await supabase.from('loads').update({ status: 'cancelled' }).eq('id', loadId);
    setLoading(false);
  }

  async function handleComplete(loadId: string) {
    setLoading(true);
    await supabase.from('loads').update({ status: 'completed' }).eq('id', loadId);
    setLoading(false);
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
    </main>
  );
}
