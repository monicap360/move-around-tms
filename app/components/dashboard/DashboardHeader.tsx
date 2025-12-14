'use client';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  initials?: string;
  fullName?: string;
}

export default function DashboardHeader({
  title,
  subtitle,
  initials,
  fullName,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-lg border-b-4 border-purple-600 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg text-white text-xl font-bold">
            {initials || 'M'}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-purple-600 font-medium">{subtitle}</p>
            )}
          </div>
        </div>

        {fullName && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-medium text-gray-900">{fullName}</p>
              <p className="text-sm text-gray-600">Dashboard User</p>
            </div>

            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
              {fullName?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
