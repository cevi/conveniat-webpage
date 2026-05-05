'use client';
import { cn } from '@/utils/tailwindcss-override';
import React, { useState } from 'react';

export const TabsClientContainer: React.FC<{
  tabs: { title: string; contentNode: React.ReactNode }[];
}> = ({ tabs }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (tabs.length === 0) return <></>;

  return (
    <div className="w-full">
      <div className="mb-8 flex w-full items-center justify-center">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTabIndex(index)}
              className={cn(
                'rounded-full px-6 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none',
                activeTabIndex === index
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900',
              )}
              aria-selected={activeTabIndex === index}
              role="tab"
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="w-full">
        {tabs.map((tab, index) => (
          <div key={index} className={cn('w-full', activeTabIndex === index ? 'block' : 'hidden')}>
            {tab.contentNode}
          </div>
        ))}
      </div>
    </div>
  );
};
