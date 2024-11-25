import React from 'react';

export const ParagraphText: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  return <p className="pb-12 font-body text-sm font-normal text-conveniat-text">{children}</p>;
};
