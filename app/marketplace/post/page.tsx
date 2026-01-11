// Marketplace Post Load Page
// For shippers to post new loads

import { useState } from 'react';

export default function MarketplacePost() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  // TODO: Wire to Supabase

  function handlePost(e: any) {
    e.preventDefault();
    // TODO: Post to Supabase
    alert('Load posted!');
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Post a New Load</h1>
      <form onSubmit={handlePost} className="space-y-4 bg-blue-50 p-6 rounded-xl">
        <div>
          <label className="block font-semibold mb-1">Origin</label>
          <input value={origin} onChange={e => setOrigin(e.target.value)} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Destination</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Weight</label>
          <input value={weight} onChange={e => setWeight(e.target.value)} className="border rounded p-2 w-full" required />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Post Load</button>
      </form>
    </main>
  );
}
