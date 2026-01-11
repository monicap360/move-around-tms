import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Driver = {
  driver_uuid: string;
  name: string;
  status: string;
};

export default function DriverPanel() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('drivers')
        .select('driver_uuid, name, status');
      if (error) {
        setError(error.message);
        setDrivers([]);
      } else {
        setDrivers(data || []);
      }
      setLoading(false);
    }
    fetchDrivers();
  }, []);

  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Drivers</div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul className="space-y-2">
          {drivers.length === 0 ? (
            <li>No drivers found.</li>
          ) : (
            drivers.map(driver => (
              <li key={driver.driver_uuid} className="flex items-center justify-between">
                <span>{driver.name}</span>
                <span className={
                  driver.status === 'Active'
                    ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded'
                    : 'bg-gray-100 text-gray-700 px-2 py-1 rounded'
                }>
                  {driver.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
