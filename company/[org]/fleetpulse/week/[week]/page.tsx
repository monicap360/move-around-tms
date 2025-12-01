'use client';

import WeeklyOps from '@/components/fleetpulse/WeeklyOps';

export default function WeeklyOpsPage({ params }) {
  return <WeeklyOps week={params.week} />;
}
