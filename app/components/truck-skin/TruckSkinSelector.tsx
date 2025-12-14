import { useState } from 'react';

const skins = [
  { name: 'Matte Black', color: '#111' },
  { name: 'Electric Blue', color: '#1e90ff' },
  { name: 'Neon Green', color: '#39ff14' },
  { name: 'Classic Red', color: '#e53935' },
  { name: 'Pearl White', color: '#f8f8ff' },
  { name: 'Safety Orange', color: '#ff9800' },
  { name: 'Construction Yellow', color: '#ffd600' },
  { name: 'Midnight Purple', color: '#6c3483' },
];

export default function TruckSkinSelector({ value, onChange }: { value: string; onChange: (skin: string) => void }) {
  const [selected, setSelected] = useState(value);
  return (
    <div className="flex gap-2 flex-wrap">
      {skins.map((skin) => (
        <button
          key={skin.color}
          className={`w-10 h-10 rounded-full border-2 ${selected === skin.color ? 'border-blue-500 scale-110' : 'border-gray-300'} transition`}
          style={{ background: skin.color }}
          onClick={() => { setSelected(skin.color); onChange(skin.color); }}
          title={skin.name}
        />
      ))}
    </div>
  );
}
