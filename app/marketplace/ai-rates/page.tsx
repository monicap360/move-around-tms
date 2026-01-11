import { useState } from 'react';

export default function MarketplaceAIRates() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState<number|null>(null);
  const [loading, setLoading] = useState(false);

  function mockPredictRate(origin: string, destination: string, weight: string) {
    // Simple mock: $2.50/mile * 1000 miles * tons
    const miles = 1000; // TODO: Replace with real distance calc
    const tons = parseFloat(weight) || 1;
    return 2.5 * miles * tons;
  }

  function handlePredict(e: any) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setRate(mockPredictRate(origin, destination, weight));
      setLoading(false);
    }, 800);
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">AI Rate Prediction</h1>
      <div className="bg-yellow-50 p-6 rounded-xl">
        <p className="mb-2">Get instant rate suggestions for your load:</p>
        <form onSubmit={handlePredict} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Origin</label>
            <input value={origin} onChange={e => setOrigin(e.target.value)} className="border rounded p-2 w-full" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Destination</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} className="border rounded p-2 w-full" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Weight (tons)</label>
            <input value={weight} onChange={e => setWeight(e.target.value)} className="border rounded p-2 w-full" required />
          </div>
          <button type="submit" className="bg-yellow-600 text-white px-6 py-2 rounded" disabled={loading}>
            {loading ? 'Predicting…' : 'Predict Rate'}
          </button>
        </form>
        {rate !== null && (
          <div className="mt-4 text-lg font-semibold text-yellow-700">
            Predicted Rate: <span className="font-mono">${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>
    </main>
  );
}
