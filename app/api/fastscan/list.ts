import type { NextApiRequest, NextApiResponse } from 'next';
import type { Scan } from '@/lib/fastscan/types';

// Use the same in-memory store as upload.ts for demo
const scans: Scan[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Return all scans (would filter by organizationId in real app)
  return res.status(200).json({ scans });
}
