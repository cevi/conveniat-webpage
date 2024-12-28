import React from 'react';

export const SubheadingH3: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h3 className="mb-1 mt-8 max-w-4xl text-balance font-heading text-base font-extrabold text-conveniat-green">
      {children}
    </h3>
  );
};
