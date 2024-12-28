import React from 'react';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="my-2 max-w-2xl text-left font-body text-base font-normal text-gray-500">
      {children}
    </p>
  );
};
