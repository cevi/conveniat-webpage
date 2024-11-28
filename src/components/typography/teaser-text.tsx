import React from 'react';

export const TeaserText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="mb-[32px] mt-[16px] hyphens-auto font-body text-[18px] font-normal leading-[26px] text-gray-500">
      {children}
    </p>
  );
};
