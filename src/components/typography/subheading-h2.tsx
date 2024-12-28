import React from 'react';

export const SubheadingH2: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2 className="mb-2 mt-8 max-w-4xl text-balance font-heading text-lg font-extrabold text-conveniat-green">
      {children}
    </h2>
  );
};
