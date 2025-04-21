import React from 'react';

export const TeaserText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="mb-3 mt-4 max-w-2xl hyphens-auto font-body text-lg font-normal text-gray-500">
      {children}
    </p>
  );
};
