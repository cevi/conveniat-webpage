import React from 'react';

export const TeaserText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="font-body mt-4 mb-3 max-w-2xl text-lg font-normal hyphens-auto text-gray-500">
      {children}
    </p>
  );
};
