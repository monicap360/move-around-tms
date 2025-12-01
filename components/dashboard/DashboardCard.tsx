'use client';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export default function DashboardCard({
  title,
  value,
  icon,
  color = 'bg-gradient-to-r from-blue-500 to-blue-600',
}: DashboardCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>

        {icon && (
          <div
            className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
