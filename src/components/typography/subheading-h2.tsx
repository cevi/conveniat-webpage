import React from 'react';

export const SubheadingH2: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2 className="max-[384px] mb-[8px] mt-[32px] text-balance font-heading text-[18px] font-extrabold leading-[24px] text-conveniat-green">
      {children}
    </h2>
  );
};
