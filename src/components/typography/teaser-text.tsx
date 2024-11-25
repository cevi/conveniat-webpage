import React from 'react';

export const TeaserText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return <p className="pb-12 font-body text-base font-normal text-conveniat-text">{children}</p>;
};
