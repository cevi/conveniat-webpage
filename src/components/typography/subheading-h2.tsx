import React from 'react';

export const SubheadingH2: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2 className="mt-10 max-w-lg py-4 font-heading text-[20px] font-extrabold leading-[32px] text-conveniat-green-500">
      {children}
    </h2>
  );
};
