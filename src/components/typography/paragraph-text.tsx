import React from 'react';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="my-[8px] text-left font-body text-[16px] font-normal leading-[24px] text-gray-500">
      {children}
    </p>
  );
};
