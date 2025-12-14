'use client';

export default function FleetLiveOps() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">
        FleetPulse AI™
      </h1>

      <p className="text-gray-300 text-lg">
        Fleet Operations Intelligence Unit • Live Situational Awareness
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <DriverTile name="John" score={92} status="Loading" />
        <DriverTile name="Mike" score={88} status="In Transit" />
        <DriverTile name="Henry" score={74} status="Idle" />
        <DriverTile name="Maria" score={91} status="Dumping" />
      </div>
    </div>
  );
}

function DriverTile({ name, score, status }) {
  return (
    <div className="
      backdrop-blur-md bg-white/5 border border-white/10 
      rounded-xl p-5 shadow-lg transition hover:bg-white/10
    ">
      <h2 className="text-xl text-white font-semibold">{name}</h2>
      <p className="text-gray-300 text-sm">{status}</p>
      <div className="text-3xl font-bold text-blue-400 mt-2">{score}</div>
    </div>
  );
}
