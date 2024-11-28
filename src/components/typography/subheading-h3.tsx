import React from 'react';

export const SubheadingH3: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h3 className="max-[384px] mb-[4px] mt-[32px] text-balance font-heading text-[16px] font-extrabold leading-[22px] text-conveniat-green">
      {children}
    </h3>
  );
};
