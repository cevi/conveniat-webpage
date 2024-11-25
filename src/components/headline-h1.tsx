import React from 'react';

export const HeadlineH1: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h1 className="max-w-lg font-heading text-[26px] font-extrabold leading-[40px] text-conveniat-green-500">
      {children}
    </h1>
  );
};
