import type React from 'react';

/** "Schnellzugriff" while the CMS configuration has not been loaded yet. */
export const DashboardQuickAccessSkeleton: React.FC = () => (
  <div className="space-y-2" aria-hidden="true">
    <div className="bg-chip h-3 w-28 animate-pulse rounded" />
    <div className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-line h-16 rounded-[14px] border bg-white" />
      ))}
    </div>
  </div>
);
