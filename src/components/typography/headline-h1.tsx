import React from 'react';

export const HeadlineH1: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <h1 className="mb-4 mt-6 max-w-4xl text-balance font-heading text-3xl font-extrabold text-conveniat-green">
      {children}
    </h1>
  );
};
