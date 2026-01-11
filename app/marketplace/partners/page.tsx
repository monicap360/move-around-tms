import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function MarketplacePartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPartners() {
      setLoading(true);
      setError('');
      const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
      if (error) setError(error.message);
      setPartners(data || []);
      setLoading(false);
    }
    fetchPartners();
    const interval = setInterval(fetchPartners, 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleMessage(partnerId: string) {
    alert('Messaging feature coming soon!');
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Partner Network</h1>
      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading partners…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Partner</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Compliance</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner: any) => (
              <tr key={partner.id}>
                <td className="border p-2">{partner.name}</td>
                <td className="border p-2">{partner.status}</td>
                <td className="border p-2">{partner.compliance_status || 'Unknown'}</td>
                <td className="border p-2 flex gap-2">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded">View</button>
                  <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleMessage(partner.id)}>Message</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
