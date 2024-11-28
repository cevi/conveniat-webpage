import React from 'react';

export const HeadlineH1: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h1 className="text-conveniat-green max-[384px] mb-[16px] mt-[24px] text-balance font-heading text-[30px] font-extrabold leading-[32px]">
      {children}
    </h1>
  );
};
