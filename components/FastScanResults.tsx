import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type OcrResult = {
  id: string;
  material: string;
  tons: number;
  price_per_ton: number;
  total: number;
  plant: string;
  customer: string;
  status: string;
  created_at?: string;
};

export default function FastScanResults() {
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOcr() {
      setLoading(true);
      setError(null);
      // For demo: fetch the most recent OCR result
      const { data, error } = await supabase
        .from('ticket_ocr_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) {
        setError(error.message);
        setOcr(null);
      } else {
        setOcr(data);
      }
      setLoading(false);
    }
    fetchOcr();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
      <h3 className="font-semibold mb-2">OCR Results</h3>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : !ocr ? (
        <div>No OCR results found.</div>
      ) : (
        <>
          <div className="mb-2">
            <span className="font-bold">Material:</span> {ocr.material}
          </div>
          <div className="mb-2">
            <span className="font-bold">Tons:</span> {ocr.tons}
          </div>
          <div className="mb-2">
            <span className="font-bold">Price/Ton:</span> ${ocr.price_per_ton?.toFixed(2)}
          </div>
          <div className="mb-2">
            <span className="font-bold">Total:</span> ${ocr.total?.toFixed(2)}
          </div>
          <div className="mb-2">
            <span className="font-bold">Plant:</span> {ocr.plant}
          </div>
          <div className="mb-2">
            <span className="font-bold">Customer:</span> {ocr.customer}
          </div>
          <div className="mb-2">
            <span className="font-bold">Status:</span> <span className={
              ocr.status === 'Complete'
                ? 'bg-green-100 text-green-700 px-2 py-1 rounded text-xs'
                : ocr.status === 'Processing'
                ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs'
                : 'bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs'
            }>{ocr.status}</span>
          </div>
        </>
      )}
    </div>
  );
}
